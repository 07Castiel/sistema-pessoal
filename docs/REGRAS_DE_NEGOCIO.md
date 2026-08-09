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

## 15. Investimentos — **[Backend]**

Tabelas `investments`, `investment_movements`, trigger
`apply_investment_movement` (enum `investment_movement_type`: `aporte`,
`resgate`, `rendimento`) — smoke-testados. **Rota `/investimentos` é
`ComingSoon`.** Nota de modelagem (`MODULO_3.md`): aporte pode também
ser registrado como despesa com categoria tipo `investimento`, e
rendimento como receita com a mesma categoria — os dois modelos (tabela
dedicada vs. transação categorizada) coexistem no schema; qual a UI
futura vai usar como fonte de verdade é **[Requer confirmação]**.

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

## 17. Orçamentos — **[Backend]**

Tabela `budgets` (planejado por categoria/mês/ano, 4 flags de alerta em
50/75/90/100%), trigger `check_budget_alerts` — smoke-testado (100% do
orçamento → notificação + flag). View `v_cash_flow_daily` pronta, sem
consumidor no frontend ainda. **Rota `/planejamento` é `ComingSoon`.**

## 18. Empréstimos — **[Backend]**

Tabela `loans` (`loan_type`: `recebido`/`concedido`,
`loan_status`: `ativo`/`quitado`/`atrasado`/`cancelado`),
`loan_installments`, trigger `recalc_loan_balance` — smoke-testado
(parcela paga → status "quitado", saldo 0). **Rota `/emprestimos` é
`ComingSoon`** (compartilhada com Financiamentos, mesma rota
`/emprestimos`).

## 19. Financiamentos — **[Backend]**

Tabela `financings` (`amortization_type`: `sac`/`price`),
`financing_installments`, trigger `recalc_financing_balance` —
smoke-testado. **Sem rota própria** — a rota `/emprestimos` no
`App.tsx` cobre "Empréstimos e Financiamentos" como um único item de
menu (`src/constants/nav.ts`); se serão duas telas ou uma só é
**[Requer confirmação]** com o usuário no momento de implementar.

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

---

## Resumo por status de implementação

| Status | Domínios |
|---|---|
| **[UI] completo** | Contas, Categorias (Fase 2, não listada acima pois fora do escopo pedido mas confirmada em `CONTEXTO_PROJETO.md`), Transações (receitas/despesas), Status de transação, Saldo, Exclusão/restauração, Parcelamentos, Recorrências, Tags, Centros de custo, Cartões/Faturas (Fase 4), Metas (Fase 4) |
| **[UI] parcial** | Anexos (só Contas + Transações), Notificações (só o sino, sem central) |
| **[Backend] pronto, sem UI** | Transferências, Investimentos, Orçamentos, Empréstimos, Financiamentos |
| **[Requer confirmação]** | Fonte de verdade de investimento (tabela dedicada vs. transação categorizada), se Empréstimos e Financiamentos serão uma tela ou duas, alcance real de notificações automáticas em uso, lacuna de ownership de `goal_contributions.goal_id` (revisada, sem impacto comprovado — ver `MODULO_4.md` seção 11) |
