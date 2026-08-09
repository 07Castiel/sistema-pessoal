# Regras de Negócio — Meu Financeiro

> Derivado do código real (`src/schemas/`, `src/repositories/`,
> `src/services/`, componentes de formulário) e dos documentos de
> handoff (`HANDOFF_CONTINUIDADE.md`, `CONTEXTO_PROJETO.md`,
> `MODULO_3.md`). Cada regra está marcada como:
> - **[UI]** — implementada e utilizável de ponta a ponta hoje.
> - **[Backend]** — schema/trigger/RPC existe no banco, sem tela no
>   frontend (`ComingSoon`).
> - **[Não implementado]** — não existe nem schema dedicado nem UI.
> - **[Requer confirmação]** — não foi possível confirmar diretamente no
>   código ou no banco; não deve ser assumido como verdade.

---

## 1. Contas — **[UI]**

- Tipos (`account_type`): `carteira`, `banco`, `caixa`, `conta_corrente`,
  `conta_poupanca`, `conta_digital`, `investimentos`,
  `conta_internacional`. Status (`account_status`): `ativa`, `inativa`,
  `arquivada`.
- `current_balance` nasce igual a `initial_balance` na criação
  ([`accounts.repository.ts`](../src/repositories/accounts.repository.ts))
  e depois só é alterado pelo trigger de saldo (nunca escrito
  diretamente pelo frontend em update).
- Não é possível excluir a última conta ativa do usuário (trigger
  `trg_prevent_last_account_delete`).
- Soft delete + restauração (`deleted_at`).
- Reconciliação: RPC `reconcile_account` compara saldo informado
  (extrato) com `current_balance`, grava a diferença em
  `account_reconciliations` e pode gerar uma transação de ajuste
  (`is_adjustment = true`, `adjustment_transaction_id`).
- Busca/filtro por nome ou banco, filtro por tipo/status, paginação por
  offset (`pageSize` padrão 10).

## 2. Transações — **[UI]**

Ver `BANCO_DE_DADOS.md` seções 20-21 para o modelo de dados completo.
Receita e despesa são a mesma entidade (`transactions.type`).

- Validação de formulário
  ([`transaction.schema.ts`](../src/schemas/transaction.schema.ts)):
  descrição 2-120 caracteres, valor > 0 e ≤ 999.999.999, conta e
  categoria obrigatórias, vencimento não pode ser anterior à data do
  lançamento.
- O tipo (`receita`/`despesa`) **não pode ser alterado depois de criado**
  — campo desabilitado no formulário de edição
  (`transaction-form-dialog.tsx`); para trocar o tipo é preciso excluir e
  recriar.
- Duplicação: copia todos os campos exceto `id`/status — a cópia nasce
  sempre `pendente`, com a data resetada para hoje, e as tags são
  copiadas.

## 3. Receitas — **[UI]**

Subconjunto de Transações com `type = "receita"`. Status possíveis:
`pendente`, `recebido`, `cancelado`. **Nunca pode ficar `pago`**
(trigger `validate_transaction_status`).

## 4. Despesas — **[UI]**

Subconjunto de Transações com `type = "despesa"`. Status possíveis:
`pendente`, `pago`, `cancelado`. **Nunca pode ficar `recebido`**.

## 5. Transferências — **[Backend]**

Tabela `transfers` (`from_account_id`, `to_account_id`, `amount`, `date`,
`description`) com trigger de saldo dedicada (débito na origem, crédito
no destino) já implementada e smoke-testada (cenário: transferência de
300 entre 2 contas → origem −300, destino +300,
`CONTEXTO_PROJETO.md` seção 31.6). **Sem tela no frontend** — não há
rota nem repository (`transfers.repository.ts` não existe em
`src/repositories/`).

## 6. Status de transação — **[UI]**

Enum `transaction_status`: `pendente`, `pago`, `recebido`, `cancelado`,
`atrasado`.

- `atrasado` **nunca é gravado no banco** — é sempre derivado
  (`status = 'pendente' AND due_date < current_date`, calculado na view
  `v_transactions_enriched` como `is_overdue`/`effective_status`). Motivo
  registrado em `MODULO_3.md`: um status armazenado exigiria um job
  diário e ficaria incorreto entre execuções; derivado, está sempre
  correto mesmo com o app fechado.
- Transições permitidas: `pendente → recebido/pago` (liquidar),
  `pendente → cancelado`, `recebido/pago → pendente` (estornar),
  `cancelado → pendente` (reativar).
- Transições bloqueadas: receita→`pago`, despesa→`recebido` (trigger
  `validate_transaction_status`).
- Na UI, liquidar por padrão à criação: um lançamento novo (sem
  repetição) já nasce marcado como liquidado (`settled: true` por
  default em `transaction-form-dialog.tsx`) — o usuário desliga o switch
  para deixar pendente.
- Parcelamentos e recorrências **sempre nascem pendentes** — bloqueado
  explicitamente no schema Zod (`repeat !== "none" && settled` é erro de
  validação).

## 7. Saldo — **[UI/Backend]**

Não há lógica de saldo no frontend — o cálculo é 100% do banco (trigger
`trg_transactions_balance` + `apply_transaction_balance` +
`_transaction_balance_effect`, delta-based). Ver `BANCO_DE_DADOS.md`
seção 19 para a regra completa e a exceção de segurança de
`_transaction_balance_effect`. O frontend só lê `accounts.current_balance`
já calculado — nunca soma/subtrai valores localmente para exibir saldo.
Regra permanente: **qualquer alteração nesta lógica exige rodar a
bateria de testes financeiros de regressão antes e depois** (herdada de
`CONTEXTO_PROJETO.md`/handoff).

## 8. Exclusão/restauração — **[UI]**

Soft delete (`deleted_at`) em Contas, Categorias, Transações e
Recorrências, com aba/tela de "Lixeira" e restauração. Como o efeito de
saldo é 0 quando `deleted_at IS NOT NULL`, excluir uma transação
liquidada reverte automaticamente o saldo, e restaurar reaplica — sem
código extra.

Exceção: **Tags e Centros de Custo usam `DELETE` físico**, sem lixeira —
seguro porque as FKs que apontam para eles em `transactions`/
`recurring_rules` são `ON DELETE SET NULL`. A tela avisa quantos
lançamentos usam o item antes de excluir (`countUsage`/`countUsageBatch`).

Exclusão de parcelamento: `softDeleteInstallmentGroup` exclui **apenas
as parcelas ainda `pendente`** do grupo — parcelas já liquidadas
permanecem (não há UI dedicada para excluir parcelas já pagas
individualmente além da exclusão normal de uma transação).

## 9. Parcelamentos — **[UI]**

RPC `create_installment_transactions`, atômica. 2 a 480 parcelas
(limite do schema Zod). Rateio sem perder centavos: as N−1 primeiras
parcelas usam o valor truncado, a última absorve a diferença. Cada
parcela tem vencimento mensal individual e é liquidada separadamente
(`date = due_date`). O valor informado no formulário é sempre o **total**,
não o valor da parcela.

## 10. Recorrências — **[UI]**

Tela `/recorrencias`. CRUD do template (`recurring_rules`), pausar
(`active = false`), reativar (`active = true`), encerrar (`active =
false` + `end_date = hoje`, diferente de pausar: é definitivo), excluir
(soft delete) + restaurar, "gerar agora" (chama `generate_due_recurrences`
diretamente do frontend). Frequências: semanal, quinzenal, mensal,
bimestral, trimestral, semestral, anual, personalizada (dias
customizados, 1-365).

- **Idempotência confirmada:** gerar duas vezes no mesmo dia não
  duplica (o avanço de `next_run_date` no banco impede).
- Editar uma regra existente **não mexe em `next_run_date`** nem nas
  transações já geradas — só o template a partir da próxima geração.
- Criar uma transação com `repeat: "recurring"` no formulário de
  Transações cria a regra **e já chama `generateDue()`** imediatamente,
  materializando a primeira ocorrência vencida na hora
  ([`transactions.service.ts`](../src/services/transactions.service.ts)).

## 11. Anexos — **[UI, parcial]**

`AttachmentsPanel` (Storage bucket `attachments`, privado) implementado
e integrado em **Contas** (desde o Módulo 1) e **Transações** (edição de
transação já existente — não aparece na criação, precisa de um `id`
salvo). O union type `AttachmentEntityType` também lista
`card_invoice`, `loan`, `financing`, `goal`, `recurring_rule`,
`investment` — **esses ainda não têm nenhuma tela que produza anexos**,
apenas o tipo já existe pronto para quando essas telas forem construídas.
Upload/preview (signed URL 300s)/exclusão com confirmação, limite 10 MB,
tipos de arquivo restritos (seção 13 de `BANCO_DE_DADOS.md`).

## 12. Tags — **[UI]**

CRUD completo (`/tags`), nome + cor. `UNIQUE(user_id, name)` — duplicidade
bloqueada com mensagem amigável (`"Você já tem uma tag com esse nome."`,
via `getErrorMessage`). Associação M:N a transações
(`TagMultiSelect`, substituição total do conjunto a cada save — não é
incremental). Filtro de transações por uma ou mais tags. Contador de uso
por tag exibido na listagem (quantas transações usam cada tag), calculado
em lote para evitar N+1.

## 13. Centros de custo — **[UI]**

CRUD completo (`/centro-de-custos`), nome + cor + ícone. Sem
`UNIQUE(user_id, name)` confirmado no schema (diferente de tags — não há
constraint de nome único documentada para `cost_centers`). Ativar/
desativar via coluna `active` (migration `0035`) — **centro inativo some
apenas do seletor de novos lançamentos**; continua resolvendo o nome em
lançamentos antigos que já o referenciam (o join não é afetado por
`active`). Filtro por status (Todos/Ativos/Inativos) e por centro de
custo na tela de Transações. Exclusão é `DELETE` físico (sem lixeira),
com aviso de quantos lançamentos usam o centro antes de excluir.

## 14. Cartões/Faturas — **[UI]** (implementado na Fase 4)

CRUD de cartões (`/cartoes`): nome, banco, bandeira, limite, dias de
fechamento/vencimento, conta associada (opcional), status
(ativo/inativo/arquivado — reaproveita `account_status`). Exclusão física
(sem `deleted_at` nesta tabela) — segura porque `card_invoices.card_id`
é `ON DELETE CASCADE` (faturas do cartão somem junto) e
`transactions.card_id`/`invoice_id` são `ON DELETE SET NULL` (transações
reais nunca são apagadas, só perdem o vínculo).

**Compra no cartão:** formulário próprio e isolado (não é o mesmo
formulário de Transações da Fase 3). Sempre gera uma despesa com
`account_id: null` (sem efeito de saldo) e `status: "pendente"` — a
liquidação acontece coletivamente ao pagar a fatura, não por compra
individual. A fatura do período é resolvida automaticamente a partir da
data da compra e do dia de fechamento do cartão (find-or-create sobre
`card_invoices`, decisão de implementação documentada em
`docs/MODULO_4.md`, não uma regra pré-existente).

**Pagar fatura:** cria uma segunda transação — despesa comum,
`account_id` setado, `status: "pago"`, `invoice_id: null` de propósito
(para não duplicar o total via `recalc_invoice_total`) — que debita a
conta escolhida através do mecanismo de saldo já existente, sem nenhuma
lógica nova. Fatura marcada `status: "paga"` só depois da transação ser
criada com sucesso.

**Limite de uso** (`v_card_usage`): soma `total_amount` das faturas
`aberta`/`fechada` do cartão — faturas `paga` liberam o limite
automaticamente (view já existente, não alterada).

**[Requer confirmação — pendências não bloqueantes, ver `docs/MODULO_4.md`
seção 9]:** seletor de cartão dentro do formulário de Transações da Fase
3 (hoje só existe pela tela de Cartões); parcelamento/recorrência de
compra no cartão (não suportado nesta primeira versão);
`recalc_invoice_total` conta compras excluídas/canceladas no total da
fatura (comportamento herdado da trigger, não corrigido nesta sessão por
exigir definição de regra antes).

## 15. Investimentos — **[UI]** (implementado na Fase 4)

CRUD de investimentos (`/investimentos`): nome, tipo (`tesouro`/`cdb`/
`lci`/`lca`/`fundos`/`acoes`/`fiis`/`etfs`/`cripto`/`exterior`),
instituição (opcional), data de aplicação, vencimento (opcional),
liquidez (texto livre, opcional), rentabilidade (texto livre, opcional),
conta associada (opcional, só informativa), observações.

**`applied_amount` e `current_amount` nunca são escritos pelo frontend**
— 100% derivados por `apply_investment_movement` a partir das
movimentações. Nascem em `0` na criação; um investimento recém-criado só
passa a ter valor depois do primeiro aporte.

**Movimentações (aporte/resgate/rendimento):**
- `amount` é sempre uma magnitude positiva; o sentido do efeito vem do
  `type` selecionado (diferente de Metas, que usa o sinal do próprio
  valor).
- **Aporte** soma em `applied_amount` (principal) e `current_amount`
  (valor atual).
- **Rendimento** soma **só** em `current_amount` — não conta como
  principal aportado.
- **Resgate** subtrai de `current_amount` — **não reduz**
  `applied_amount`, que permanece como o total histórico aportado.
- **Editar uma movimentação existente é suportado** (tipo e valor) — a
  trigger reprocessa o efeito antigo e aplica o novo corretamente; testado
  com valores reais.
- Excluir uma movimentação recalcula `applied_amount`/`current_amount`
  automaticamente.

**Exclusão do investimento:** sempre física — **o schema não tem
`deleted_at` nem coluna de status** em `investments` (diferente de
Contas/Categorias/Transações/Recorrências), então **não há suporte a
restaurar**. A UI avisa explicitamente no diálogo de confirmação que a
exclusão remove também todo o histórico de movimentações
(`ON DELETE CASCADE`) e não pode ser desfeita.

**Aparência:** sem colunas `color`/`icon` no schema — a UI deriva ícone e
cor de `type` via um mapa fixo no frontend, não personalizável por
investimento individual.

**Patrimônio líquido:** `v_net_worth.total_investments` soma
`current_amount` de todos os investimentos do usuário — qualquer
movimentação reflete automaticamente no dashboard.

**[Requer confirmação — não alterado, mantido como estava]:** nota de
modelagem de `MODULO_3.md` permanece válida — aporte/rendimento também
*podem* ser registrados como transação categorizada (despesa/receita com
categoria tipo `investimento`), um caminho paralelo que não foi unificado
com `investment_movements` nesta sessão. Os dois modelos coexistem no
schema; qual a UI deve tratar como fonte de verdade principal continua em
aberto.

**[Requer confirmação — achado revisado, não corrigido, ver
`docs/MODULO_4.md` seção 18]:** `investment_movements.investment_id` não
tem validação de ownership via trigger. Testado e confirmado que isso
**não permite corromper** `applied_amount`/`current_amount` de outro
usuário (RLS de `investments` bloqueia a atualização cruzada dentro da
própria trigger) — decisão deliberada de não criar migration, mesma
lógica aplicada em Metas.

## 16. Metas — **[UI]** (implementado na Fase 4)

CRUD de metas (`/metas`): nome, valor-alvo, prazo (opcional), prioridade
(`baixa`/`media`/`alta`), categoria associada (opcional, só informativa —
não filtra nem soma transações automaticamente), cor, ícone.

**`current_amount` nunca é escrito pelo frontend** — é 100% derivado por
`recalc_goal_amount` a partir da soma de `goal_contributions.amount`.

**Aporte/retirada:** ação "Novo aporte ou retirada" no detalhe da meta.
Aporte grava `amount` positivo, retirada grava `amount` negativo (não há
coluna de tipo no banco — a distinção "aporte"/"retirada" existe só no
formulário do frontend). Excluir uma movimentação recalcula
`current_amount` automaticamente (trigger `AFTER DELETE`).

**Conclusão automática:** quando `current_amount >= target_amount`, o
banco avança `status` de `em_andamento` para `concluida` sozinho (trigger
`check_goal_completion`) — **não existe ação manual "concluir meta"** na
UI, é sempre consequência de aportes reais. **Importante:** esse avanço
**nunca reverte** — uma retirada que derrube `current_amount` abaixo do
alvo não volta o status para `em_andamento` automaticamente (comportamento
do banco, confirmado em teste real, preservado sem alteração).

**Cancelar/reabrir:** ação explícita do usuário (`status → cancelada` /
`status → em_andamento`), independente da conclusão automática. Meta
cancelada não permite novos aportes/retiradas pela UI (mas o histórico
existente é preservado).

**Exclusão:** física (sem `deleted_at` nesta tabela) — remove também todo
o histórico de contribuições (`ON DELETE CASCADE`), com aviso explícito
no diálogo de confirmação.

**[Requer confirmação — achado revisado, não corrigido, ver
`docs/MODULO_4.md` seção 11]:** `goal_contributions.goal_id` não tem
validação de ownership via trigger (diferente de `transactions.card_id`/
`invoice_id`). Testado e confirmado que isso **não permite corromper**
`current_amount` de outro usuário (RLS de `goals` bloqueia a atualização
cruzada dentro da própria trigger) — decisão deliberada de não criar
migration para uma lacuna sem impacto comprovado.

## 17. Orçamentos — **[UI]** (implementado na Fase 4)

CRUD de orçamento (`/planejamento`): categoria (restrito a categorias de
despesa ativas — decisão de UI, o banco não restringe o tipo por FK),
mês, ano, valor planejado. `UNIQUE(user_id, category_id, month, year)` —
duplicidade bloqueada com mensagem amigável.

**"Realizado" nunca é escrito pelo frontend** — é sempre recalculado a
partir de `v_category_summary` (mesma view/fonte de verdade usada no
Dashboard), filtrada por `category_type='despesa'` no período. Isso é
equivalente ao filtro que `check_budget_alerts` usa
(`type='despesa' AND status='pago'`), porque uma categoria de despesa só
pode ser usada em transações `type='despesa'`
(`validate_transaction_references`). **Percentual utilizado, saldo
restante e status (sob controle/atenção/estourado)** são sempre
derivados na renderização a partir de planejado × realizado — nunca
armazenados.

**Alertas:** faixas visuais no próprio card (verde <50%, amarelo
50–90%, vermelho ≥90%) refletem o "realizado" ao vivo. Além disso, a
trigger `check_budget_alerts` insere uma notificação real em
`notifications` (consumida pelo sino global) ao cruzar 50/75/90/100% —
**monotônico, nunca reseta**: excluir a transação que gerou o alerta ou
aumentar `planned_amount` depois não desmarca as flags já enviadas
(mesmo comportamento de `check_goal_completion`). Ao atingir 100% de uma
vez, as 4 flags são marcadas em cascata (confirmado em teste real).

**Sem "valor realizado" nem status ativo/inativo no schema** — não há
"desativar" um orçamento, só editar ou excluir.

**Exclusão:** física (sem `deleted_at` nesta tabela).

**[Requer confirmação — achado revisado, não corrigido, ver
`docs/BANCO_DE_DADOS.md` seção 27]:** `budgets.category_id` não tem
validação de ownership via trigger. Testado e confirmado que isso não
permite corromper nem visualizar dado de outro usuário — mesma classe de
achado de Metas/Investimentos/Empréstimos, RLS contém o dano.

## 18. Empréstimos — **[UI]** (implementado na Fase 4)

CRUD de empréstimos simples (`/emprestimos`, aba "Empréstimos"): pessoa,
tipo (`recebido` = peguei emprestado / `concedido` = emprestei), valor
principal, número de parcelas, valor de cada parcela (sugerido como
`principal/N`, editável — o acordo real entre as partes pode incluir
juros informais não modelados separadamente), data de início, conta
associada (opcional, só informativa), observações.

As `N` parcelas são geradas automaticamente na criação, mensais a partir
da data de início, todas com o mesmo valor (sem detalhamento de
juros/amortização — o schema de `loan_installments` não tem essas
colunas).

**Pagamento:** incremental — o valor informado soma ao `paid_amount` já
registrado; a parcela só vira `pago` quando o total atinge `amount`
(pagamento parcial suportado e testado). **`remaining_balance` e
`status` nunca são calculados no frontend** — sempre lidos de
`loans` após o recálculo do trigger.

**Atraso:** `status='atrasado'` é sincronizado sob demanda ao listar
(parcelas `pendente` com vencimento passado), não gravado pelo usuário
nem derivado só na exibição — decisão de implementação documentada em
`docs/MODULO_4.md` seção 23.

**Exclusão:** sempre física — `loans` não tem `deleted_at`; remove
também todas as parcelas (`ON DELETE CASCADE`).

**Edição:** só metadados (pessoa, tipo, conta, observações) — valor,
parcelas e datas não são editáveis após criado (exigiria regenerar todo
o cronograma).

## 19. Financiamentos — **[UI]** (implementado na Fase 4)

CRUD de financiamentos (`/emprestimos`, aba "Financiamentos"): nome,
sistema de amortização (SAC ou Price), valor financiado, taxa de juros
(% ao mês — decisão de implementação, `interest_rate` não tem unidade
explícita no schema), número de parcelas, data de início, conta
associada (opcional), observações.

O cronograma completo (`amount`, `amortization_amount`, `interest_amount`,
`remaining_balance` por parcela) é calculado no frontend
(`src/lib/financing-schedule.ts`) e gravado de uma vez na criação — não
existe RPC nem trigger para isso no banco. Fórmulas validadas
matematicamente (soma das amortizações = principal exato, saldo final =
0 exato) antes de gravar qualquer dado real.

**Pagamento, atraso e exclusão:** mesmas regras de Empréstimos (seção 18)
— pagamento incremental/parcial, sincronização de atraso sob demanda,
exclusão física em cascata.

**Edição:** só metadados (nome, conta, observações) — amortização,
valor, taxa e parcelas não são editáveis após criado.

**Nota de UX (bug real corrigido, ver `MODULO_4.md` seção 27):** o
"saldo devedor" de um financiamento inclui juros futuros e pode começar
maior que o valor originalmente financiado — por isso a listagem não
mostra mais "% pago" comparando os dois (métrica que dava resultado
negativo); o progresso real (parcelas pagas) só é mostrado dentro do
detalhe, onde as parcelas já estão carregadas.

**[Requer confirmação]:** unidade de `interest_rate` (percentual vs.
fração) não é verificável só pelo schema — assumido percentual por
período, documentado como decisão, não fato confirmado.

## 20. Notificações — **[Backend, parcial]**

Tabela `notifications` (`notification_type`: `conta_vencendo`, `fatura`,
`meta_atrasada`, `saldo_negativo`, `saldo_baixo`, `limite_cartao`,
`orcamento_estourado`, `geral`). Existe `notifications.repository.ts` e
`use-notifications.ts`, consumidos por `NotificationsBell` no layout
(sino no header) — portanto **há alguma UI** (exibição), mas não há uma
central/tela dedicada de notificações, e os triggers que efetivamente
geram notificações automáticas (`check_budget_alerts`,
`check_goal_completion`, etc.) pertencem a módulos ainda sem UI de
origem (orçamento, metas). O alcance exato do que já dispara notificação
hoje na prática de uso real é **[Requer confirmação]**.

## 21. Auditoria — **[Backend + parcial UI]**

`audit_trigger_fn` grava `audit_logs` para mutações em `transactions`,
`accounts`, `categories`, `recurring_rules` (old/new data em JSONB, IP,
user-agent). Eventos de autenticação (login, logout) gravados
manualmente pelo `auditService` no `AuthProvider`, não por trigger.
Existe `audit-logs.repository.ts` com `listForRecord` — usado para
histórico por registro (ex.: histórico de uma conta,
`AccountHistorySheet`), mas **não há uma tela de auditoria global** que
liste todos os eventos do sistema.

## 22. Relatórios — **[UI]** (implementado na Fase 4)

Página `/relatorios` reutiliza deliberadamente as mesmas 4 views já
usadas pelo Dashboard (`v_monthly_summary`, `v_category_summary`,
`v_cash_flow_daily`, `v_net_worth`) — nenhum cálculo financeiro novo no
frontend, por exigência explícita do usuário de manter uma única fonte
de verdade e evitar divergência com o Dashboard.

**Visão geral do período:** receitas/despesas/resultado líquido/taxa de
economia somados sobre um intervalo de mês/ano selecionável (`v_monthly_summary`,
sem filtro no banco — todas as linhas do usuário buscadas uma vez, range
recortado em memória). Gráfico de evolução mensal (receita × despesa)
para o mesmo intervalo.

**Por categoria:** um mês/ano por vez (mesmo padrão do Dashboard/
Orçamento), abas despesa/receita, gráfico de pizza + ranking com
percentual do total (`v_category_summary`).

**Fluxo de caixa:** intervalo de datas livre (`v_cash_flow_daily`,
suporta filtro nativo de data — única das 4 views que já exclui
transações excluídas, ver `BANCO_DE_DADOS.md` seção 32).

**Patrimônio:** snapshot atual (`v_net_worth`) com o detalhamento por
componente (contas, investimentos, a receber, a pagar, financiamentos),
não só o total que o Dashboard mostra.

**Sem filtro por conta** — nenhuma das 4 views aceita esse filtro sem
recalcular no frontend (duplicando a lógica que a view já centraliza);
decisão deliberada de não adicionar, documentada em
`docs/MODULO_4.md` Parte 6, não uma omissão.

**[Requer confirmação]** `v_monthly_summary`/`v_category_summary` não
excluem transações movidas para a lixeira (`deleted_at`) do total — ao
contrário de `v_cash_flow_daily` e do saldo de conta, que excluem
corretamente. Comportamento herdado do Dashboard (já em produção),
reproduzido intencionalmente por consistência — não corrigido nesta
sessão porque afetaria também Dashboard e Orçamento. Ver
`BANCO_DE_DADOS.md` seção 32 para o achado completo.

**Bug real corrigido nesta sessão (não é regra de negócio, é
infraestrutura):** `v_net_worth` estava quebrada para qualquer usuário
`authenticated` desde a Fase 1 (dependia de uma tabela sem `GRANT`) — o
card "Patrimônio líquido" do Dashboard sempre mostrou `R$ 0,00`
silenciosamente. Corrigido via migration aditiva, sem alterar nenhuma
regra financeira. Ver `BANCO_DE_DADOS.md` seção 32.

---

## Resumo por status de implementação

| Status | Domínios |
|---|---|
| **[UI] completo** | Contas, Categorias (Fase 2, não listada acima pois fora do escopo pedido mas confirmada em `CONTEXTO_PROJETO.md`), Transações (receitas/despesas), Status de transação, Saldo, Exclusão/restauração, Parcelamentos, Recorrências, Tags, Centros de custo, Cartões/Faturas (Fase 4), Metas (Fase 4), Investimentos (Fase 4), Empréstimos (Fase 4), Financiamentos (Fase 4), Orçamentos (Fase 4), Relatórios (Fase 4) |
| **[UI] parcial** | Anexos (só Contas + Transações), Notificações (só o sino, sem central; sino não invalida em tempo real após mutações — lacuna pré-existente, não introduzida pelo módulo de Orçamentos) |
| **[Backend] pronto, sem UI** | Transferências |
| **[Requer confirmação]** | Fonte de verdade de investimento (tabela dedicada vs. transação categorizada), unidade de `financings.interest_rate` (percentual vs. fração), alcance real de notificações automáticas em uso, lacuna de ownership de `goal_contributions.goal_id`/`investment_movements.investment_id`/`loan_installments.loan_id`/`financing_installments.financing_id`/`budgets.category_id` (todas revisadas, sem impacto comprovado — ver `MODULO_4.md`), `v_monthly_summary`/`v_category_summary` não excluem transações na lixeira do total (diferente de `v_cash_flow_daily` e do saldo de conta) — ver `BANCO_DE_DADOS.md` seção 32 |
