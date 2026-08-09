# Fase 4 — Cartões, Faturas e Metas

> **Parte 1 (seções 1-9): Cartões e Faturas.** Backend (`credit_cards`,
> `card_invoices`, `v_card_usage`, trigger `recalc_invoice_total`) já
> existia desde a Fase 1, sem UI. Implementada UI completa e integração com
> Transações, reaproveitando 100% da arquitetura em camadas já estabelecida
> (`repository → service → hook → component/page`). Única mudança de banco:
> hardening de segurança pontual (migration `0036`).
>
> **Parte 2 (seções 10-15): Metas.** Backend (`goals`, `goal_contributions`,
> triggers `recalc_goal_amount`/`check_goal_completion`) também já existia
> desde a Fase 1, sem UI. Implementada UI completa. **Nenhuma migration** —
> módulo inteiramente aditivo sobre o schema existente, sem lacuna de
> segurança que exigisse correção (ver seção 13).

---

## 1. Decisão central: isolamento da lógica de saldo

**Compra no cartão nunca mexe em saldo de conta.** Uma compra é uma
`transactions` com `account_id: null`, `card_id`, `invoice_id` e
`status: "pendente"` — `_transaction_balance_effect` retorna `0` quando
`account_id is null`, então o mecanismo de saldo (`apply_transaction_balance`,
inalterado) nunca é acionado por uma compra. O valor da compra entra na
fatura via `recalc_invoice_total` (trigger já existente, também inalterada).

**Pagar a fatura é uma despesa comum.** A ação "Pagar fatura" cria uma
**segunda** transação — `account_id: <conta escolhida>`, `status: "pago"`,
`amount: total_amount da fatura`, **`invoice_id: null`** (de propósito) —
que passa pelo trigger de saldo normal, exatamente como qualquer despesa
paga. Ela debita a conta escolhida.

`invoice_id` fica `null` nessa transação de pagamento porque
`recalc_invoice_total` soma `amount` de toda `transactions` com aquele
`invoice_id` — se a transação de pagamento apontasse para a própria fatura,
o total dobraria. Confirmado por teste real (seção 6): total da fatura
permaneceu R$ 150.000,00 após o pagamento, não R$ 300.000,00.

Resultado: **nenhuma das três functions financeiras críticas
(`apply_transaction_balance`, `_transaction_balance_effect`,
`apply_transfer_balance`) foi tocada.** Cartões/faturas são inteiramente
aditivos sobre a arquitetura existente.

## 2. Resolução do período da fatura — decisão de implementação

Não existe RPC nem trigger no banco para decidir a qual fatura uma compra
pertence — é responsabilidade nova, implementada em
[`src/lib/card-invoice.ts`](../src/lib/card-invoice.ts) (`resolveInvoicePeriod`,
função pura, sem I/O):

- Compra até o dia de fechamento do cartão (`closing_day`), inclusive →
  fatura do mês corrente.
- Compra após o fechamento → fatura do mês seguinte.
- Vencimento: primeira ocorrência de `due_day` a partir do fechamento
  (mesmo mês se `due_day > closing_day`, senão mês seguinte) — convenção
  usual de cartão de crédito brasileiro.
- Dias que não existem no mês (ex.: 31 em fevereiro) são ajustados para o
  último dia do mês (`clampDay`).

`card-invoices.service.ts` (`resolveInvoiceId`) faz *find-or-create* sobre
`card_invoices`, usando a `UNIQUE(card_id, reference_month)` já existente
no banco como chave de idempotência: se a fatura do período já existe,
reaproveita; senão, cria.

**Isso é uma decisão de implementação desta sessão, não uma regra
confirmada previamente em nenhuma documentação — sinalizado aqui para
que uma sessão futura possa revisar ou confirmar com o usuário se
necessário.**

## 3. Isolamento do formulário de Transações (Fase 3 preservada)

Compra no cartão usa um formulário **próprio e isolado**
(`card-purchase.schema.ts` + `CardPurchaseDialog`), deliberadamente
separado de `transaction.schema.ts`/`TransactionFormDialog`. Motivo:
`account_id` é obrigatório no schema de Transações (regra testada e
validada na Fase 3); mudar isso para suportar "despesa sem conta" exigiria
alterar um formulário já testado, arriscando regressão. Compras no cartão
entram na tabela `transactions` normalmente e **aparecem na tela de
Transações** (mesma listagem, mesmo soft delete/restauração) — só o
formulário de criação é outro.

**Consequência aceita, documentada como pendência (seção 9):** a tela de
Transações não tem um seletor de cartão nem exibe badge de cartão na
linha — a única forma de lançar/ver uma compra no contexto do cartão é
pela tela de Cartões. Journal completo da compra (categoria, tags, centro
de custo, notas) é idêntico ao de uma despesa comum.

## 4. Migration aplicada — hardening de `invoice_id`

`0036_validate_transaction_invoice_ownership`, aplicada e **aprovada pelo
usuário antes de rodar** (única migration desta sessão):

- **Achado:** a trigger `validate_transaction_references` já validava
  ownership de `account_id`/`category_id`/`cost_center_id`/`card_id`
  (padrão da migration `0025`, Fase 3), mas **não validava `invoice_id`**
  — a FK só exigia que a fatura existisse, não que pertencesse ao mesmo
  usuário. Como a Fase 4 é o primeiro módulo a popular `invoice_id` de
  verdade, isso era uma vulnerabilidade real e imediata (mesma classe do
  achado original da migration 0025).
- **Correção:** `create or replace function` na mesma trigger, acrescentando
  a checagem de `invoice_id` (4 linhas, mesmo padrão das outras 4 colunas),
  mais `drop/create trigger` para incluir `invoice_id` na lista de colunas
  que disparam a revalidação em `UPDATE`.
- **Testado e confirmado bloqueado** (seção 6): usuário B tentando inserir
  uma transação com `invoice_id` de uma fatura do usuário A recebe
  `Fatura inválida ou pertencente a outro usuário.`
- Nenhuma tabela, coluna ou dado existente foi alterado; `credit_cards`/
  `card_invoices` estavam com 0 linhas no momento da aplicação.

## 5. Arquivos criados/alterados

**Novos:**
```
src/lib/card-invoice.ts                        resolveInvoicePeriod, effectiveInvoiceStatus
src/schemas/credit-card.schema.ts               formulário de cartão
src/schemas/card-purchase.schema.ts             formulário isolado de compra
src/repositories/credit-cards.repository.ts     CRUD + v_card_usage
src/repositories/card-invoices.repository.ts    faturas + transações da fatura
src/services/credit-cards.service.ts            passthrough
src/services/card-invoices.service.ts           resolveInvoiceId, createPurchase, payInvoice
src/hooks/use-credit-cards.ts
src/hooks/use-card-invoices.ts
src/components/cards/credit-card-form-dialog.tsx
src/components/cards/credit-card-visual.tsx     tile do cartão + barra de limite
src/components/cards/invoice-detail-sheet.tsx   navegação de fatura + transações
src/components/cards/card-purchase-dialog.tsx
src/components/cards/pay-invoice-dialog.tsx
docs/MODULO_4.md                                este arquivo
```

**Modificados:**
```
src/pages/cards/cards.tsx              ComingSoon → página completa
src/repositories/transactions.repository.ts
  + createCardPurchase (account_id null, invoice_id resolvido, status pendente)
  + createInvoiceSettlement (account_id setado, status pago, invoice_id null)
src/constants/icon-registry.ts         + CREDIT_CARD_ICON_OPTIONS
src/lib/errors.ts                      + mensagem amigável para card_invoices_card_id_reference_month_key
docs/CONTEXTO_PROJETO.md               seção 6 (funcionalidades) e histórico atualizados
docs/ARQUITETURA.md                    seção 20 atualizada (7 ComingSoon restantes, não 8)
docs/BANCO_DE_DADOS.md                 seções 23 e 31 atualizadas (migration 0036)
docs/REGRAS_DE_NEGOCIO.md              seção 14 (Cartões/Faturas) reescrita de [Backend] para [UI]
```

Nenhum arquivo da Fase 3 (`transaction.schema.ts`, `transaction-form-dialog.tsx`,
`transactions.tsx`, etc.) foi alterado, exceto a extensão aditiva de
`transactions.repository.ts` acima (duas funções novas, nenhuma existente
tocada).

## 6. Testes executados (banco de produção, usuários descartáveis)

Metodologia idêntica à da Fase 3 (migration `0034`): usuários criados via
`auth.users`, operações executadas **como role `authenticated`** (não
`postgres`), via `set_config('request.jwt.claims', ...)`. Todos os dados
de teste removidos ao final — confirmado contagem zero.

### Financeiro (regra de ouro: saldo antes vs. esperado vs. obtido)

| Cenário | Saldo antes | Esperado | Obtido | Resultado |
|---|---|---|---|---|
| Criar cartão + 2 compras (150 + 50) na mesma fatura | 1000,00 | 1000,00 (sem efeito) | 1000,00 | ✅ |
| Total da fatura após as 2 compras | — | 200,00 | 200,00 | ✅ |
| `v_card_usage` (limite 2000) após as compras | — | usado 200 / disponível 1800 | usado 200 / disponível 1800 | ✅ |
| Pagar fatura (200,00) pela conta | 1000,00 | 800,00 | 800,00 | ✅ |
| Total da fatura após o pagamento (não deve dobrar) | — | 200,00 | 200,00 | ✅ |
| `v_card_usage` após fatura paga | — | usado 0 / disponível 2000 | usado 0 / disponível 2000 | ✅ |

Repetido depois via UI real (navegador, usuário descartável): compra
lançada → fatura "Ago/2026", fechamento e vencimento corretos, total
batendo com a transação → "Pagar fatura" → status "Paga", total
inalterado, saldo da conta "Carteira" foi de R$ 0,00 para
**−R$ 150.000,00** (valor da fatura paga), confirmado na tela de Contas.

### Segurança / RLS multiusuário

Dois usuários descartáveis (A e B), operações como role `authenticated`:

- B: `SELECT` de cartão/fatura de A = 0 linhas em ambos os casos.
- B: `UPDATE` do status da fatura de A (tentando reverter "paga" →
  "aberta") = 0 linhas afetadas; confirmado que o valor real (`status`,
  `paid_account_id`) permaneceu exatamente como A deixou.
- B: `DELETE` do cartão de A = 0 linhas afetadas; cartão de A confirmado
  intacto depois.
- B: `INSERT` de transação com `card_id` de A = bloqueado por
  `validate_transaction_references` (`Cartão inválido ou pertencente a
  outro usuário.`) — checagem pré-existente, reconfirmada.
- B: `INSERT` de transação com `invoice_id` de A = bloqueado por
  `validate_transaction_references` (`Fatura inválida ou pertencente a
  outro usuário.`) — **checagem nova desta sessão (migration 0036),
  teste principal desta fase.**

### Técnico

- **TypeScript** (`tsc -b --noEmit`): 0 erros.
- **ESLint**: 0 erros, 4 warnings pré-existentes (mesmos de sempre,
  `react-refresh/only-export-components` em `shadcn/ui`). Um erro real
  (`react-hooks/set-state-in-effect` em `invoice-detail-sheet.tsx`) foi
  encontrado e corrigido durante a implementação — ver seção 7.
- **Build de produção:** sucesso, ~36s, bundle 1,48 MB / 418 KB gzip
  (cresceu ~30 KB gzip em relação à Fase 3, dentro do esperado para um
  módulo novo; aviso de chunk grande já existia antes, não é regressão
  desta fase).
- **Security Advisor** (`get_advisors`, tipo security): idêntico ao
  pré-Fase 4 — só `auth_leaked_password_protection`, pré-existente e não
  relacionado.
- **UI no navegador:** dark mode ativo (`class="dark"` no `<html>`),
  viewport mobile 375px sem overflow horizontal (`scrollWidth ===
  clientWidth`), console sem erros novos (só o `403` esporádico já
  documentado na Fase 3 como ocorrendo em trocas de sessão, não
  relacionado a este módulo).

## 7. Bug encontrado e corrigido durante a implementação

| # | Onde | Bug | Correção |
|---|---|---|---|
| 1 | `invoice-detail-sheet.tsx` | `useEffect` chamando `setSelectedId` para escolher a fatura mais recente por padrão disparava o lint `react-hooks/set-state-in-effect` (antipadrão: estado derivável sendo sincronizado via efeito) | Removido o `useEffect`; a fatura selecionada agora é derivada diretamente na renderização (`sorted[index] ?? null`, com fallback para a mais recente quando `selectedId` não pertence à lista atual) |

## 8. Limitações conhecidas (não são bugs desta fase — comportamento herdado de triggers já existentes, fora do escopo tocar)

- **`recalc_invoice_total` soma `amount` de toda `transactions` com aquele
  `invoice_id`, sem filtrar `deleted_at is null` nem `status`.** Uma
  compra excluída (lixeira) ou cancelada continua contando no total da
  fatura. Confirmado lendo o código-fonte da function
  (`pg_get_functiondef`) antes de implementar — não é uma regressão desta
  sessão, é o comportamento da trigger desde que foi escrita. Não foi
  alterado porque é uma trigger financeira fora do escopo autorizado
  desta sessão (só a migration de ownership de `invoice_id` foi aprovada).
  **Pendência para decisão futura:** se isso deve ser corrigido, é
  necessário definir a regra correta primeiro (excluir/cancelar uma
  compra deveria remover o valor da fatura? E se a fatura já estiver
  paga?) antes de tocar na trigger.
- **Falha parcial em "Pagar fatura":** `payInvoice` cria a transação de
  liquidação e só depois marca a fatura como paga — se a criação da
  transação falhar, nada é marcado (seguro); mas se a transação for
  criada com sucesso e o `UPDATE` de `card_invoices` falhar logo em
  seguida (ex.: rede caiu no meio), a fatura fica "aberta" mesmo com o
  saldo já debitado. Não há uma transação de banco única (RPC) cobrindo
  as duas operações. Aceitável para uma primeira versão; listado como
  possível melhoria futura na seção 9.

## 9. Pendências não bloqueantes / próximos passos

- Seletor de cartão e badge de cartão dentro do formulário/linha de
  Transações (hoje só existe pela tela de Cartões, seção 3).
- RPC única para `payInvoice` (transação de liquidação + `UPDATE` de
  `card_invoices` em uma só operação atômica de banco), evitando o estado
  parcial descrito acima.
- Corrigir `recalc_invoice_total` para ignorar `deleted_at`/`cancelado`
  (decisão de regra de negócio pendente de confirmação — ver acima).
- Compras parceladas/recorrentes no cartão não são suportadas nesta
  primeira versão (só lançamento simples) — `create_installment_transactions`
  aceita `p_card_id` mas não `p_invoice_id`, então parcelas criadas por
  essa RPC não entrariam automaticamente em nenhuma fatura; precisa de
  desenho específico antes de implementar.
- Fechamento automático de fatura (`aberta` → `fechada` no banco) não
  existe — o status "Fechada" mostrado na UI é sempre derivado
  (`effectiveInvoiceStatus`), nunca gravado. Suficiente para exibição;
  uma automação real exigiria um job agendado (fora do escopo desta
  sessão, mesmo espírito de `generate_due_recurrences` ser chamada sob
  demanda em vez de por `pg_cron`).

---

# Parte 2 — Metas

Segundo módulo implementado na Fase 4. Backend (`goals`,
`goal_contributions`, triggers `recalc_goal_amount`/`check_goal_completion`)
já existia desde a Fase 1. Módulo mais simples que Cartões/Faturas: sem
relação com contas ou saldo, sem período/fatura para resolver, sem
transação de liquidação — é puramente `goals`/`goal_contributions`.

## 10. Decisões de modelo confirmadas lendo o código-fonte das triggers

Antes de implementar, as duas functions foram lidas via
`pg_get_functiondef` (não documentado anteriormente em nenhum lugar):

- **`recalc_goal_amount`** (trigger `AFTER INSERT/UPDATE/DELETE` em
  `goal_contributions`): soma `amount` de todas as contribuições da meta e
  grava em `goals.current_amount`. **Sem CHECK de sinal** — `amount` pode
  ser negativo. Diferente de `investment_movements` (que tem uma coluna
  `type` de enum), `goal_contributions` **não tem coluna de tipo** — a
  única forma de representar "retirada" é gravar `amount` negativo.
- **`check_goal_completion`** (trigger `BEFORE UPDATE OF current_amount`
  em `goals`): se `current_amount >= target_amount` e `status =
  'em_andamento'`, avança para `'concluida'`. **Só avança, nunca reverte**
  — se depois uma retirada derrubar `current_amount` abaixo de
  `target_amount`, o status permanece `'concluida'`. Comportamento
  confirmado empiricamente no teste financeiro (seção 12): retirada de
  R$ 200 de uma meta concluída de R$ 1.000 deixou `current_amount = 800`
  mas `status` continuou `'concluida'`.

**Consequências de implementação, ambas derivadas diretamente do
comportamento acima (não inventadas):**
- `goalContributionSchema` tem um campo `kind: "aporte" | "retirada"` só
  no frontend; o repository converte para `amount` positivo/negativo antes
  de gravar (`goal-contributions.repository.ts`, `create`).
- `goals.repository.ts` nunca escreve `current_amount` diretamente — nem
  em `create` (nasce com o default `0` do banco) nem em `update` (só
  nome/valor-alvo/prazo/prioridade/categoria/cor/ícone).
- A UI não tem um botão "marcar meta como concluída" manual — só a
  trigger completa uma meta, com base em contribuições reais. Reabrir uma
  meta cancelada volta para `'em_andamento'` (ação explícita do usuário,
  `setStatus`), mas nada reverte `'concluida'` automaticamente.

## 11. Sem migration — achado de segurança avaliado e não corrigido

Diferente de Cartões (migration `0036`), `goal_contributions.goal_id`
**não tem** uma trigger de validação de ownership análoga a
`validate_transaction_references`. Investigado antes de decidir: seria
possível o usuário B inserir uma `goal_contributions` com `goal_id` da
meta do usuário A (a policy de INSERT só verifica `user_id = auth.uid()`,
não a origem de `goal_id`)?

**Testado meticulosamente (seção 12):** sim, o INSERT malicioso é aceito
(cria uma linha "órfã" pertencente a B, referenciando a meta de A) — mas
`recalc_goal_amount` roda como `SECURITY INVOKER`, então o `UPDATE
public.goals ... WHERE id = affected` que ela executa roda com o
privilégio de B; a RLS de `goals` (`user_id = auth.uid()`) filtra essa
`UPDATE` para 0 linhas afetadas, porque a meta pertence a A, não a B.
**Confirmado empiricamente:** `current_amount` da meta de A permaneceu
exatamente `1000.00` antes e depois do ataque.

**Decisão:** não criar migration para isso. A lacuna é real, mas seu
impacto está contido pelo RLS de `goals` — não é uma vulnerabilidade de
corrupção de dado de outro usuário, é uma linha "fantasma" que só o
próprio atacante consegue ver (via `goal_contributions_select_own`, que
não vaza nada de A). Diferente do achado de `invoice_id` (migration
`0036`), aqui o dano real é nulo, não apenas teoricamente baixo — por
isso não configurou "alteração de banco realmente indispensável" (regra
do prompt desta sessão). **Registrado aqui como achado revisado, não como
pendência a corrigir às cegas** — se o padrão do projeto evoluir para
exigir ownership trigger em toda tabela filha independente de impacto
comprovado, isso pode ser revisitado.

## 12. Testes financeiros e de segurança (banco de produção, usuários descartáveis)

Mesma metodologia das sessões anteriores — usuários via `auth.users`,
operações como role `authenticated`, dados removidos ao final (contagem
zero confirmada).

| Cenário | Esperado | Obtido | Resultado |
|---|---|---|---|
| Criar meta (alvo 1000) | `current_amount = 0`, `status = em_andamento` | `0.00` / `em_andamento` | ✅ |
| Aporte de 400 | `current_amount = 400` | `400.00` | ✅ |
| + Aporte de 600 (total 1000 = alvo) | `current_amount = 1000`, `status = concluida` (auto) | `1000.00` / `concluida` | ✅ |
| Retirada de 200 (grava `amount = -200`) | `current_amount = 800`, `status` continua `concluida` | `800.00` / `concluida` | ✅ (confirma que a trigger não reverte) |
| Excluir a retirada (`DELETE`) | `current_amount` volta a `1000` (recálculo via `AFTER DELETE`) | `1000.00` | ✅ |

**Segurança / RLS multiusuário:**
- B: `SELECT` da meta de A = 0 linhas.
- B: `UPDATE`/`DELETE` da meta de A = 0 linhas afetadas; meta de A
  confirmada intacta depois.
- B: `INSERT` de `goal_contributions` com `goal_id` da meta de A = aceito
  (lacuna conhecida, seção 11), mas `current_amount` de A **não foi
  corrompido** — confirmado antes/depois do ataque (`1000.00` → `1000.00`).

**UI no navegador** (usuário descartável): criar meta → aportar o valor
total → meta marcada "Concluída" automaticamente, visível no card e no
sheet de detalhe.

## 13. Bug encontrado e corrigido durante a implementação

| # | Onde | Bug | Correção |
|---|---|---|---|
| 1 | `goals.tsx` / `GoalDetailSheet` | O sheet de detalhe recebia uma cópia (`Goal` object) capturada no momento do clique (`useState<Goal \| null>`); após registrar um aporte, a query `["goals"]` era invalidada e a lista recarregava, mas o objeto guardado no estado da página continuava sendo o snapshot antigo — o sheet mostrava `current_amount`/`status` desatualizados até fechar e reabrir. Reproduzido no navegador: aporte do valor total não atualizava o progresso/status no sheet aberto, embora o banco já estivesse correto (confirmado via SQL e reabrindo a página). | `openGoal` deixou de ser um `useState<Goal>` e passou a ser derivado a cada render a partir da lista já buscada (`useState<string \| null>` só para o id + `(goals ?? []).find(g => g.id === openGoalId)`) — mesmo padrão recomendável para qualquer sheet/dialog futuro que exiba dado que muda enquanto está aberto. |

## 14. Arquivos criados/alterados

**Novos:**
```
src/schemas/goal.schema.ts                        goalSchema + goalContributionSchema (kind aporte/retirada)
src/repositories/goals.repository.ts
src/repositories/goal-contributions.repository.ts
src/services/goals.service.ts                      passthrough
src/services/goal-contributions.service.ts          passthrough
src/hooks/use-goals.ts
src/hooks/use-goal-contributions.ts
src/components/goals/goal-form-dialog.tsx
src/components/goals/goal-card.tsx                  tile com barra de progresso
src/components/goals/goal-contribution-dialog.tsx    aporte/retirada
src/components/goals/goal-detail-sheet.tsx           progresso + histórico
```

**Modificados:**
```
src/pages/goals/goals.tsx              ComingSoon → página completa
src/constants/icon-registry.ts         + GOAL_ICON_OPTIONS
docs/MODULO_4.md                       esta seção (Parte 2)
docs/CONTEXTO_PROJETO.md               seção 33 estendida
docs/BANCO_DE_DADOS.md                 seção 25 (Metas)
docs/REGRAS_DE_NEGOCIO.md              seção 16 (Metas)
docs/ARQUITETURA.md                    contagem de ComingSoon (6 restantes)
```

Nenhum arquivo de Cartões/Faturas ou de fases anteriores foi tocado.

## 15. Validação técnica

- **TypeScript** (`tsc -b --noEmit`): 0 erros (checado antes e depois da
  correção do bug da seção 13).
- **ESLint**: 0 erros, 4 warnings pré-existentes (mesmos de sempre).
- **Build de produção:** sucesso, ~22s, bundle 1,50 MB / 421 KB gzip.
- **Security Advisor:** idêntico ao anterior — só
  `auth_leaked_password_protection`, pré-existente.
- Todos os usuários e dados de teste (SQL e navegador) removidos,
  contagem zero confirmada.

## Pendências não bloqueantes (Metas)

- Sem anexos (`AttachmentsPanel`) na meta — não solicitado, não
  implementado; a infraestrutura já suporta se necessário no futuro
  (bastaria adicionar `"goal"` como uso real de `AttachmentEntityType`,
  que já existe no union type).
- Sem vínculo entre `goals.category_id` e transações reais — a categoria
  da meta é só informativa hoje, não filtra nem soma transações
  automaticamente.
- Lacuna de ownership de `goal_contributions.goal_id` avaliada e não
  corrigida (seção 11) — decisão registrada, não uma omissão.
