# Banco de Dados — Meu Financeiro

> Derivado de `src/types/database.types.ts` (tipos gerados pelo Supabase
> MCP, fonte de verdade estrutural — 24 tabelas, 7 views, 6 functions
> expostas, 18 enums, todos transcritos diretamente do arquivo, sem
> suposição) e de `docs/CONTEXTO_PROJETO.md`/`docs/MODULO_3.md` para
> histórico de migrations, RLS, segurança e decisões de design que não
> aparecem no arquivo de tipos. Não existe pasta `supabase/migrations`
> local — todas as migrations foram aplicadas remotamente via MCP. Este
> documento **não cria nem sugere nenhuma migration nova.**

---

## 1. Visão geral

Banco único, projeto Supabase `financeiro-leonardo` (ref
`xocehjrujmaxhwqhxelo`, região `sa-east-1`). Schema `public` com 24
tabelas, todas com RLS habilitado, todas com FK para o usuário
(diretamente via `user_id` ou, no caso de `transaction_tags`, via
subquery de ownership). Nenhum backend próprio: o frontend acessa o
banco diretamente via `supabase-js`/PostgREST.

## 2. PostgreSQL/Supabase

Postgres **17.6**, gerenciado pelo Supabase (Auth + Storage inclusos).
Extensão `pg_trgm` instalada no schema `extensions` (não em `public`,
migration `0032`, correção de exposição desnecessária).

## 3. Migrations conhecidas

37 migrations aplicadas (`0001`–`0036` + 1 sem prefixo numérico), nenhuma
apagada, faixas conforme `docs/CONTEXTO_PROJETO.md` seção 5:

| Faixa | Conteúdo |
|---|---|
| `0001`–`0012` | Schema inicial completo (24 tabelas), triggers de saldo/`updated_at`, seed de signup (`handle_new_user`), RLS inicial, views, hardening inicial |
| `0013`–`0020` | Módulo 1 (Contas): auditoria genérica, soft delete, anexos polimórficos, bucket Storage, RPC de reconciliação |
| `0021`–`0023` | Módulo 2 (Categorias): soft delete + `sort_order`, RLS otimizado, trigger anti-mudança-de-tipo-com-filhos |
| `0024`–`0033` | Fase 3 (Transações) — ver seção 20 abaixo |
| `0034` | `revoke_public_execute_legacy_trigger_functions` — hardening de `EXECUTE` (seção 31) |
| `0035` | `cost_centers_active_flag` — coluna `active` em `cost_centers` |
| `0036` | `validate_transaction_invoice_ownership` — Fase 4, ownership de `invoice_id` (seção 31) |
| `fix_v_net_worth_auth_users_permission` | Fase 4, módulo Relatórios — corrige `v_net_worth` quebrada (bug real, não vulnerabilidade), seção 32. Aplicada sem prefixo numérico por engano (deveria ser `0037_...`) — funcionalmente idêntica, só o nome foge da convenção. |

Este documento **não altera nem cria nenhuma migration**. Qualquer
mudança de schema deve passar por `list_migrations` do MCP do Supabase
primeiro, para não duplicar ou colidir com o que já existe.

## 4. Tabelas (24, todas em `public`, todas com RLS)

Lista completa com colunas exatas, extraída de
`src/types/database.types.ts`:

| Tabela | Colunas principais | Observação |
|---|---|---|
| `profiles` | `id` (PK = `auth.users.id`), `full_name`, `avatar_url`, `currency`, `language`, `theme`, `monthly_goal`, `annual_goal` | Estende `auth.users` 1:1, criada por `handle_new_user` no signup |
| `accounts` | `id, user_id, name, bank, type, status, color, icon, initial_balance, current_balance, is_default, deleted_at, created_at, updated_at` | Soft delete. `current_balance` mantido por trigger, nunca escrito diretamente pelo frontend em criação/edição (repository só escreve `current_balance = initial_balance` na criação) |
| `account_reconciliations` | `id, account_id, user_id, statement_balance, previous_balance, difference, adjustment_transaction_id, notes, reconciled_at, created_at` | Histórico gerado pela RPC `reconcile_account` |
| `categories` | `id, user_id, name, type, icon, color, parent_id, sort_order, is_default, deleted_at, created_at, updated_at` | Hierarquia de 1 nível (`parent_id` aponta só para categoria raiz), soft delete |
| `cost_centers` | `id, user_id, name, color, icon, active, created_at` | **Sem `deleted_at`** — exclusão é `DELETE` físico; `active` (migration `0035`) para ativar/desativar sem apagar |
| `tags` | `id, user_id, name, color, created_at` | **Sem `deleted_at`** — exclusão é `DELETE` físico. `UNIQUE(user_id, name)` (constraint `tags_user_id_name_key`) |
| `transactions` | `id, user_id, type, description, amount, category_id, account_id, cost_center_id, supplier, payment_method, card_id, invoice_id, date, due_date, paid_date, status, recurring_id, installment_group_id, installment_number, installment_total, notes, is_adjustment, currency, deleted_at, created_at, updated_at` | Núcleo do sistema — ver seção 20 |
| `transaction_tags` | `transaction_id, tag_id` | M:N, sem PK própria além do par (composto), sem `user_id` direto — ownership validado por subquery via `transaction_id`/`tag_id` |
| `recurring_rules` | `id, user_id, type, description, amount, category_id, account_id, cost_center_id, supplier, payment_method, frequency, interval_days, start_date, end_date, next_run_date, lead_days, active, last_generated_transaction_id, notes, currency, deleted_at, created_at, updated_at` | Template de recorrência — ver seção 22 |
| `attachments` | `id, user_id, entity_type, entity_id, file_name, file_url, file_size, created_at` | Polimórfica (`entity_type` é `text`, não enum do banco) |
| `credit_cards` | `id, user_id, account_id, name, bank, brand, credit_limit, closing_day, due_day, color, icon, status, created_at, updated_at` | Schema pronto, **sem UI** (`/cartoes` é `ComingSoon`) |
| `card_invoices` | `id, user_id, card_id, reference_month, closing_date, due_date, total_amount, status, paid_account_id, paid_at, created_at` | Schema pronto, sem UI |
| `transfers` | `id, user_id, from_account_id, to_account_id, amount, description, date, created_at` | Schema pronto, sem UI — trigger de saldo dedicada já existe (ver seção 19) |
| `subscriptions` | `id, user_id, name, amount, billing_cycle, category_id, account_id, card_id, active, next_billing_date, color, icon, created_at, updated_at` | Schema pronto, sem UI, sem rota dedicada no `App.tsx` |
| `investments` | `id, user_id, account_id, name, type, institution, applied_amount, current_amount, application_date, maturity_date, liquidity, rate_description, notes, created_at, updated_at` | Schema pronto, sem UI (`/investimentos` é `ComingSoon`) |
| `investment_movements` | `id, user_id, investment_id, type, amount, date, notes, created_at` | Schema pronto, sem UI |
| `loans` | `id, user_id, account_id, type, person_name, principal_amount, interest_rate, installment_amount, installments_total, remaining_balance, status, start_date, notes, created_at, updated_at` | Schema pronto, sem UI (`/emprestimos` é `ComingSoon`) |
| `loan_installments` | `id, user_id, loan_id, number, amount, paid_amount, due_date, paid_date, status, created_at` | Schema pronto, sem UI |
| `financings` | `id, user_id, account_id, name, principal_amount, interest_rate, installments_total, amortization, remaining_balance, status, start_date, notes, created_at, updated_at` | Schema pronto, sem UI |
| `financing_installments` | `id, user_id, financing_id, number, amount, amortization_amount, interest_amount, paid_amount, remaining_balance, due_date, paid_date, status, created_at` | Schema pronto, sem UI |
| `goals` | `id, user_id, name, category_id, target_amount, current_amount, target_date, priority, status, color, icon, created_at, updated_at` | Schema pronto, sem UI (`/metas` é `ComingSoon`) |
| `goal_contributions` | `id, user_id, goal_id, amount, date, notes, created_at` | Schema pronto, sem UI |
| `budgets` | `id, user_id, category_id, year, month, planned_amount, alert_50_sent, alert_75_sent, alert_90_sent, alert_100_sent, created_at, updated_at` | UI completa (`/planejamento`), Fase 4 — ver seção 27 |
| `notifications` | `id, user_id, type, title, message, related_table, related_id, read, created_at` | Schema pronto; consumido por `useNotifications`/`NotificationsBell` no layout, mas sem central de notificações dedicada |
| `audit_logs` | `id, user_id, table_name, record_id, action, old_data, new_data, ip_address, user_agent, created_at` | Auditoria genérica, alimentada por `audit_trigger_fn` + eventos manuais de auth (login/logout) |

## 5. Relacionamentos

Extraídos de `Relationships` em `database.types.ts`. Os mais relevantes
para o núcleo já implementado:

- `transactions.account_id → accounts.id`
- `transactions.category_id → categories.id`
- `transactions.cost_center_id → cost_centers.id`
- `transactions.card_id → credit_cards.id`
- `transactions.invoice_id → card_invoices.id`
- `transactions.recurring_id → recurring_rules.id`
- `transaction_tags.transaction_id → transactions.id`, `transaction_tags.tag_id → tags.id`
- `categories.parent_id → categories.id` (auto-relacionamento, 1 nível)
- `account_reconciliations.adjustment_transaction_id → transactions.id`
- `recurring_rules.last_generated_transaction_id → transactions.id`

FKs de `cost_center_id`/`recurring_id` em `transactions` e
`recurring_rules` **não têm `ON DELETE CASCADE`** — confirmado em
`CONTEXTO_PROJETO.md` seção 32.4: são `ON DELETE SET NULL`, por isso
excluir fisicamente um `cost_center` nunca deixa uma transação com
referência quebrada.

## 6. Enums (18, valores exatos de `database.types.ts`)

| Enum | Valores |
|---|---|
| `account_status` | `ativa`, `inativa`, `arquivada` |
| `account_type` | `carteira`, `banco`, `caixa`, `conta_corrente`, `conta_poupanca`, `conta_digital`, `investimentos`, `conta_internacional` |
| `amortization_type` | `sac`, `price` |
| `billing_cycle` | `mensal`, `anual` |
| `card_brand` | `visa`, `mastercard`, `elo`, `amex`, `hipercard`, `outro` |
| `category_type` | `receita`, `despesa`, `transferencia`, `investimento` |
| `goal_status` | `em_andamento`, `concluida`, `cancelada` |
| `installment_status` | `pendente`, `pago`, `atrasado` |
| `investment_movement_type` | `aporte`, `resgate`, `rendimento` |
| `investment_type` | `tesouro`, `cdb`, `lci`, `lca`, `fundos`, `acoes`, `fiis`, `etfs`, `cripto`, `exterior` |
| `invoice_status` | `aberta`, `fechada`, `paga`, `atrasada` |
| `loan_status` | `ativo`, `quitado`, `atrasado`, `cancelado` |
| `loan_type` | `recebido`, `concedido` |
| `notification_type` | `conta_vencendo`, `fatura`, `meta_atrasada`, `saldo_negativo`, `saldo_baixo`, `limite_cartao`, `orcamento_estourado`, `geral` |
| `payment_method` | `dinheiro`, `debito`, `credito`, `pix`, `boleto`, `transferencia`, `outro` |
| `priority_level` | `baixa`, `media`, `alta` |
| `recurrence_frequency` | `mensal`, `semanal`, `anual`, `quinzenal`, `personalizada`, `bimestral`, `trimestral`, `semestral` |
| `transaction_status` | `pendente`, `pago`, `recebido`, `cancelado`, `atrasado` (`atrasado` nunca é gravado — seção 20) |
| `transaction_type` | `receita`, `despesa` (só esses dois, de propósito — seção 20) |

## 7. Views (7, todas `security_invoker = true`)

| View | Colunas (resumo) | Uso no frontend |
|---|---|---|
| `v_monthly_summary` | `user_id, year, month, total_income, total_expense, balance` | Gráfico de barras do dashboard (`dashboardRepository.getMonthlySummaries`) |
| `v_category_summary` | `user_id, year, month, category_id, category_name, category_icon, category_color, category_type, total_amount` | Gráfico de pizza do dashboard, por tipo (`getCategorySummary`) |
| `v_net_worth` | `user_id, total_accounts, total_investments, total_payable_loans, total_receivable_loans, total_financings, net_worth` | `dashboardRepository.getNetWorth`, `reportsRepository.getNetWorth` — patrimônio líquido. **Corrigida na Fase 4/Relatórios — ver seção 32, era inutilizável para qualquer usuário `authenticated` antes da correção.** |
| `v_card_usage` | `card_id, user_id, name, credit_limit, used_amount, available_limit` | `credit-cards.repository.ts` (Fase 4, Cartões) |
| `v_transactions_enriched` | Todas as colunas de `transactions` + `account_name/color/icon`, `category_name/color/icon/parent_id/parent_category_name`, `cost_center_name/color`, `tags` (jsonb), `tag_ids` (uuid[]), `is_overdue`, `effective_status` | Listagem principal de Transações, dashboard (recentes/a vencer/atrasadas) |
| `v_cash_flow_daily` | `user_id, date, inflow, outflow, net` | `reportsRepository.getCashFlow` (Fase 4, Relatórios) — único filtro `deleted_at IS NULL` entre as 4 views financeiras, ver seção 32 |
| `v_pending_by_due_date` | `user_id, type, due_date, is_overdue, items, total` | `dashboardRepository.getPendingSummary` — 4 KPIs de pendências |

`security_invoker = true` confirmado em `CONTEXTO_PROJETO.md` seção 9 —
todas respeitam o RLS das tabelas base, nenhuma vaza dado entre usuários
mesmo sendo consultadas diretamente. **Isso não significa que todas
funcionavam** — `v_net_worth` tinha `security_invoker = true` corretamente
configurado, mas dependia de uma tabela (`auth.users`) sem `GRANT` para
`authenticated`, então toda consulta como usuário real falhava com
`permission denied` (não é uma falha de isolamento entre usuários, é uma
falha de acesso — ver seção 32).

## 8. Functions (todas em `public`)

O arquivo de tipos gerado expõe (seção `Functions`) apenas as
**chamáveis via PostgREST/RPC** — as demais (triggers, `SECURITY
DEFINER` internas) não aparecem porque não são invocáveis por
`supabase.rpc(...)`. Ver seção 31 para a lista completa das 11 functions
legadas e seus privilégios.

## 9. RPCs expostas ao frontend (6, com assinatura exata)

| RPC | Args | Retorno | Chamada em |
|---|---|---|---|
| `create_installment_transactions` | `p_type, p_description, p_total_amount, p_installments, p_first_due_date, p_account_id?, p_category_id?, p_cost_center_id?, p_supplier?, p_payment_method?, p_notes?` | `string` (id do grupo) | `transactionsRepository.createInstallments` |
| `generate_due_recurrences` | *(nenhum)* | `number` (qtd. gerada) | `recurringRulesRepository.generateDue` |
| `reconcile_account` | `p_account_id, p_statement_balance, p_notes?` | linha de `account_reconciliations` | `accountsRepository.reconcile` |
| `reorder_categories` | `p_category_ids: string[]` | `void` | `categoriesRepository.reorder` |
| `_next_recurrence_date` | `p_frequency, p_from, p_interval_days` | `string` (data) | Interna ao banco (usada por `generate_due_recurrences`); não chamada diretamente pelo frontend |
| `_transaction_balance_effect` | `t: transactions` (linha completa) | `number` | Chamada **internamente** por `apply_transaction_balance` — não chamada diretamente pelo frontend, mas precisa de `EXECUTE` para `authenticated` (seção 31) |

## 10. Triggers

Em `transactions` (9 triggers, `CONTEXTO_PROJETO.md` seção 7):

| Trigger | Function | Evento |
|---|---|---|
| `trg_transactions_balance` | `apply_transaction_balance` | AFTER I/U/D — aplica delta no saldo da conta |
| `trg_recalc_invoice_total` | `recalc_invoice_total` | AFTER I/U/D — recalcula total da fatura |
| `trg_check_budget_alerts` | `check_budget_alerts` | AFTER I/U — notificação de orçamento |
| `trg_set_updated_at` | `set_updated_at` | BEFORE U |
| `trg_prevent_transaction_on_deleted_account` | `prevent_transaction_on_deleted_account` | BEFORE I/U de `account_id` |
| `trg_normalize_transaction_paid_date` | `normalize_transaction_paid_date` | BEFORE I/U — sincroniza `paid_date` com `status` |
| `trg_validate_transaction_references` | `validate_transaction_references` | BEFORE I/U — valida ownership de conta/categoria/centro de custo/cartão |
| `trg_validate_transaction_status` | `validate_transaction_status` | BEFORE I/U — impede gravar `atrasado`, impede receita=pago/despesa=recebido |
| `trg_audit_transactions` | `audit_trigger_fn` | AFTER I/U/D |

Em `accounts`: `trg_set_updated_at`, `trg_prevent_last_account_delete`,
`trg_audit_accounts`. Em `categories`: `trg_set_updated_at`,
`trg_prevent_deep_category_nesting`,
`trg_enforce_category_type_consistency`,
`trg_prevent_delete_category_with_active_children`,
`trg_prevent_category_type_change_with_children`, `trg_audit_categories`.
Em `recurring_rules`: `trg_audit_recurring_rules`. Demais tabelas (não
tocadas nas Fases 1-3): triggers de saldo de transferência, recálculo de
fatura/investimento/empréstimo/financiamento/meta — existem desde a Fase
1, smoke-testados na migration `0034` (seção 31.6), sem UI que os
exercite ainda.

## 11. RLS

Habilitado nas 24 tabelas de `public`. Padrão: 4 policies por tabela
(select/insert/update/delete), condição `user_id = (select auth.uid())`.
Tabelas sem `user_id` direto (`transaction_tags`) usam subquery validando
o dono da transação e da tag.

**Duas formas convivendo:** tabelas das Fases 2/3 usam
`(select auth.uid())` (elimina o warning `auth_rls_initplan` — avaliado
1x por query); tabelas do Módulo 1/Fase 1 anteriores ainda usam
`auth.uid()` solto. Não é bug — é otimização não retroagida, candidata a
limpeza futura, **não confundir com inconsistência de segurança.**

## 12. Policies — vulnerabilidade encontrada e corrigida

A policy de INSERT de `transactions` originalmente validava só
`user_id`, não `account_id`/`category_id`/`cost_center_id`/`card_id`. Um
usuário conseguia inserir uma transação referenciando a conta de outro
usuário. RLS sozinho **não bastava**. Corrigido pela trigger
`validate_transaction_references` (migration `0025`), testada e
confirmada bloqueada (`CONTEXTO_PROJETO.md` seção 10 e 20). **Lição para
qualquer tabela nova com FK para outra tabela do mesmo usuário: replicar
esse padrão de validação de ownership via trigger, não confiar só em
RLS.**

## 13. Storage

Bucket único `attachments`: privado (`public: false`), limite 10 MB por
arquivo, MIME permitidos `image/jpeg`, `image/png`, `image/webp`,
`image/heic`, `application/pdf`. Policies de `storage.objects`
restringem cada usuário à própria pasta (`{user_id}/...` via
`storage.foldername`). Caminho de objeto:
`{userId}/{entityType}/{entityId}/{uuid}.{ext}` (definido no frontend,
`attachments.repository.ts`).

## 14. Índices relevantes (`transactions`)

12 índices no total (`CONTEXTO_PROJETO.md` seção 6): PK, `user_id`,
`account_id`, `category_id`, `card_id`, `date`, `status`,
`installment_group_id`, `cost_center_id`, `recurring_id`, `invoice_id`,
`deleted_at`, mais os compostos:

- `idx_transactions_user_date_id` — `(user_id, date desc, id desc)`,
  parcial (`deleted_at is null`) — sustenta a listagem principal.
- `idx_transactions_user_due` — `(user_id, due_date)` parcial — vencimentos.
- `idx_transactions_user_trashed` — `(user_id, deleted_at desc)` parcial — lixeira.
- `idx_transactions_user_paid_date` — `(user_id, paid_date)` parcial — agregações do dashboard/fluxo de caixa.
- Três índices GIN trigram (`description`, `supplier`, `notes`) para
  busca `ILIKE '%termo%'`.

## 15. Convenções de soft delete

Ver também [`ARQUITETURA.md`](./ARQUITETURA.md) seção 14. Tabelas com
`deleted_at`: `accounts`, `categories`, `transactions`,
`recurring_rules`. Tabelas **sem** `deleted_at` que usam `DELETE`
físico: `tags`, `cost_centers` — seguro porque as FKs que apontam para
elas são `ON DELETE SET NULL`.

## 16. Convenções de timestamps

`created_at timestamptz` (default `now()`) em todas as tabelas.
`updated_at timestamptz`, mantido por `trg_set_updated_at`/`set_updated_at`,
presente nas tabelas que representam entidades editáveis (`accounts`,
`categories`, `transactions`, `recurring_rules`, `credit_cards`,
`investments`, `financings`, `loans`, `goals`, `budgets`, `profiles`).
Tabelas de evento/histórico puro (`account_reconciliations`,
`audit_logs`, `goal_contributions`, `investment_movements`, `transfers`)
não têm `updated_at` — fazem sentido como imutáveis.

## 17. Convenção de sinais dos valores financeiros

`amount numeric(14,2)` é **sempre positivo** em `transactions`
(constraint `chk_transactions_amount_positive`, `MODULO_3.md`). O sinal
vem exclusivamente de `type` (`receita` soma, `despesa` subtrai — ver
seção 19). Nunca floating point.

## 18. Integridade financeira

- `amount > 0` (constraint).
- Compatibilidade categoria×tipo aplicada por trigger (tabela na seção
  21).
- `validate_transaction_status` bloqueia `atrasado` gravado diretamente
  e combinações inválidas (receita=`pago`, despesa=`recebido`).
- `validate_transaction_references` bloqueia referência a conta/categoria
  de outro usuário ou já excluída.
- `currency char(3) default 'BRL'` — preparado para multi-moeda, conversão
  **não implementada** (limitação conhecida, `MODULO_3.md`).

## 19. Atualização automática de saldos

**Não há mecanismo próprio da Fase 3** — reaproveita o trigger
`trg_transactions_balance` do Módulo 1 (`apply_transaction_balance`),
modelo de **delta**:

```
UPDATE → saldo −= efeito(OLD); saldo += efeito(NEW)
```

`_transaction_balance_effect(t transactions) RETURNS numeric`:

```
account_id IS NULL          → 0
deleted_at IS NOT NULL      → 0
receita  + recebido         → +amount
despesa  + pago             → −amount
qualquer outro caso         →  0
```

Como o trigger é delta e a function retorna `0` para linhas com
`deleted_at IS NOT NULL`, **soft delete e restauração ficam corretos
automaticamente**, sem código adicional no frontend nem no banco.
Concorrência: `UPDATE accounts SET current_balance = current_balance +
delta` é atômico sob `READ COMMITTED` (Postgres relê a linha sob lock
dentro do próprio comando) — duas liquidações simultâneas não se perdem.

### `_transaction_balance_effect` — atenção especial

Esta function é uma **exceção deliberada** dentro do hardening de
segurança do projeto e não deve ser modificada sem análise nova:

- **`SECURITY INVOKER`** — roda com o privilégio de quem a chamou, não do
  dono da function.
- **Parâmetro:** `t public.transactions` (a linha inteira, não campos
  soltos) — `RETURNS numeric`, ou seja, **não** é uma function de
  trigger (`RETURNS trigger`); é tecnicamente invocável direto via RPC.
- **Function pura:** sem leitura de outra tabela, sem side effect — só
  calcula um número a partir dos campos da linha recebida.
- **Chamada interna:** invocada explicitamente de dentro de
  `apply_transaction_balance` (`public._transaction_balance_effect(new)`),
  que é `SECURITY INVOKER` — portanto essa chamada interna roda com o
  privilégio do usuário `authenticated` dono da transação, não do dono da
  function.
- **Por que precisa de `EXECUTE` para `authenticated`:** como
  `apply_transaction_balance` é `SECURITY INVOKER` e chama
  `_transaction_balance_effect` como o próprio usuário autenticado, esse
  usuário precisa ter `EXECUTE` na function chamada — senão o trigger de
  saldo falha com `permission denied for function
  _transaction_balance_effect` em **toda** inserção, edição ou exclusão
  de transação.
- **Por que não revogar sem nova análise:** é a única das 11 functions
  legadas (seção 31) que não é `RETURNS trigger` — as outras 10 não
  dependem de `EXECUTE` porque o Postgres dispara triggers
  independentemente dessa checagem. Revogar `EXECUTE` de `authenticated`
  nesta function específica **quebra o mecanismo de saldo do sistema
  inteiro**. Se um dia ela for refatorada (ex.: virar `SECURITY DEFINER`,
  ou deixar de ser chamada por `apply_transaction_balance`), essa
  concessão precisa ser reavaliada — não removida de forma reflexa.

## 20. Transações

Entidade única (`public.transactions`) para receita e despesa,
distinguidas por `type`. Decisão registrada em `MODULO_3.md`: evita
duplicar lógica de saldo/status/soft delete/auditoria/busca entre duas
tabelas. `transaction_type` tem só `receita`/`despesa` de propósito —
transferência, pagamento de fatura, aporte/rendimento de investimento já
têm modelagem própria ou são casos de uso desses dois tipos.

**Status** (`transaction_status`): `pendente`, `recebido` (receita
liquidada), `pago` (despesa liquidada), `cancelado`. `atrasado` nunca é
gravado — é derivado na view (`status = 'pendente' AND due_date IS NOT
NULL AND due_date < current_date`), sempre correto mesmo com o app
fechado. `validate_transaction_status` recusa gravar `atrasado`
diretamente.

**Transições permitidas:** `pendente → recebido/pago` (liquidar),
`pendente → cancelado`, `recebido/pago → pendente` (estornar),
`cancelado → pendente` (reativar). Bloqueadas: receita com `pago`,
despesa com `recebido`.

### Compatibilidade de categoria × tipo de transação

| Tipo da categoria | Receita | Despesa |
|---|---|---|
| `receita` | ✅ | ❌ |
| `despesa` | ❌ | ✅ |
| `investimento` | ✅ | ✅ |
| `transferencia` | ❌ | ❌ |

Aplicada no banco (trigger) **e** espelhada no frontend
(`useTransactionLookups`).

Migrations desta fase (`MODULO_3.md`): `0024` (`deleted_at`, `currency`,
correção do efeito de saldo, normalização de `paid_date`), `0025`
(constraint de valor positivo, validação de ownership, coerência
tipo/status), `0026` (índices e `pg_trgm`), `0027` (RLS otimizado +
auditoria), `0028` (views enriquecida/fluxo de caixa/pendências), `0029`
(novas frequências), `0030` (campos de template em `recurring_rules`),
`0031` (RPCs de parcelamento e recorrência), `0032` (move `pg_trgm` para
`extensions`), `0033` (tags agregadas na view enriquecida).

## 21. Parcelamentos

RPC atômica `create_installment_transactions`: gera as N linhas de uma
vez, ligadas por `installment_group_id`, cada uma com
`installment_number`/`installment_total`. Rateio sem perder centavos —
as N−1 primeiras usam o valor truncado, a última absorve a diferença
(`100,00/3 → 33,33+33,33+33,34`). `date = due_date` por parcela, para
que cada uma pertença ao mês certo nos relatórios.

## 22. Recorrências

Modelo baseado em **regra**, não materialização em massa.
`recurring_rules` guarda o template; `generate_due_recurrences()`
materializa só as ocorrências vencidas (respeitando `lead_days`),
chamada sob demanda ao abrir o app ou pelo botão "Gerar agora".
Frequências: `semanal`, `quinzenal`, `mensal`, `bimestral`, `trimestral`,
`semestral`, `anual`, `personalizada` (via `interval_days`).
**Idempotência:** `FOR UPDATE` serializa chamadas concorrentes; o avanço
de `next_run_date` impede duplicação; guard de 240 iterações evita laço
infinito. Ativar/pausar = `active`. Encerrar = `active=false` +
`end_date=hoje`.

## 23. Faturas

Tabelas `credit_cards`/`card_invoices` com schema completo (enum
`invoice_status`: `aberta`, `fechada`, `paga`, `atrasada`), trigger
`recalc_invoice_total` já ativo desde a Fase 1. **UI implementada na Fase
4** (`docs/MODULO_4.md`) — rota `/cartoes`. Resolução do período da
fatura (`reference_month`/`closing_date`/`due_date` a partir de
`closing_day`/`due_day`) é feita no frontend (`src/lib/card-invoice.ts`),
não no banco — não existe RPC nem trigger para isso. `fechada`/`atrasada`
nunca são gravados pela UI (só `aberta` na criação e `paga` no pagamento
manual) — são sempre derivados por data para exibição, mesmo espírito do
`effective_status` de transações. **Limitação conhecida, não introduzida
por esta fase:** `recalc_invoice_total` soma `amount` de toda
`transactions` vinculada por `invoice_id` sem filtrar `deleted_at`/
`status` — uma compra excluída ou cancelada continua contando no total da
fatura (confirmado lendo `pg_get_functiondef`, não alterado por não ser
migration aprovada nesta sessão).

## 24. Investimentos

Tabelas `investments`/`investment_movements`. **UI implementada na Fase
4** (`docs/MODULO_4.md`, Parte 3) — rota `/investimentos`. Módulo isolado:
sem relação com contas, saldo ou transações (`investments.account_id` é
só um vínculo informativo opcional, sem trigger que o utilize).

- **`apply_investment_movement`** (`AFTER INSERT/UPDATE/DELETE` em
  `investment_movements`, `SECURITY INVOKER`): `aporte` e `rendimento`
  somam em `current_amount`; `resgate` subtrai. **Só `aporte` soma em
  `applied_amount`** — resgate e rendimento não o alteram (`applied_amount`
  é o total historicamente aportado, nunca diminui). `UPDATE` reprocessa o
  delta completo (reverte o efeito antigo, aplica o novo) — editar tipo ou
  valor de uma movimentação é seguro e implementado na UI.
- **`amount` é sempre uma magnitude positiva** — diferente de
  `goal_contributions` (retirada = valor negativo), aqui o sinal do efeito
  vem de `type` (`aporte`/`resgate`/`rendimento`), sem CHECK constraint
  que force isso (confiança no `type`, não no sinal do valor).
- **Sem `deleted_at` nem coluna de status** em `investments` — diferente
  de Contas/Categorias/Transações/Recorrências, não há soft delete
  possível neste schema. Exclusão é sempre física (segura:
  `investment_movements.investment_id` é `ON DELETE CASCADE`, nenhuma
  outra tabela referencia `investments`).
- **Sem colunas `color`/`icon`** — diferente de Contas/Cartões/Metas/
  Centros de Custo. A UI deriva aparência de `type` via mapa fixo no
  frontend, não personalizável por linha.
- **`v_net_worth.total_investments`** soma `current_amount` de todos os
  investimentos do usuário sem filtro — alimenta diretamente o patrimônio
  líquido do dashboard.
- **Achado de segurança avaliado, sem migration:**
  `investment_movements.investment_id` não tem trigger de validação de
  ownership (mesma ausência de `goal_contributions.goal_id`, Parte 2 do
  `MODULO_4.md`). Testado: usuário B inserindo uma
  `investment_movements` com `investment_id` de A é aceito, mas como
  `apply_investment_movement` é `SECURITY INVOKER`, a `UPDATE` que faz em
  `investments` é bloqueada pela RLS (0 linhas, meta de A intacta).
  Confirmado empiricamente, sem migration criada — mesma decisão de
  Metas.

## 25. Metas

Tabelas `goals`/`goal_contributions`. **UI implementada na Fase 4**
(`docs/MODULO_4.md`, Parte 2) — rota `/metas`.

- **`recalc_goal_amount`** (`AFTER INSERT/UPDATE/DELETE` em
  `goal_contributions`, `SECURITY INVOKER`): soma `amount` de todas as
  contribuições da meta em `goals.current_amount`. Sem CHECK de sinal —
  aporte é `amount` positivo, retirada é `amount` negativo (não existe
  coluna de tipo em `goal_contributions`, diferente de
  `investment_movements`).
- **`check_goal_completion`** (`BEFORE UPDATE OF current_amount` em
  `goals`): avança `status` de `em_andamento` para `concluida` quando
  `current_amount >= target_amount`. **Nunca reverte** — uma retirada que
  derrube `current_amount` abaixo do alvo não volta o status para
  `em_andamento` (confirmado empiricamente em teste real,
  `docs/MODULO_4.md` seção 12).
- **Sem `deleted_at`** em `goals` — "exclusão" via UI usa `status` na
  prática (`cancelada` para desativar preservando histórico; `DELETE`
  físico só remove de vez). `goal_contributions.goal_id` é `ON DELETE
  CASCADE` a partir de `goals` — excluir uma meta remove seu histórico de
  aportes junto, sem afetar nenhuma outra tabela.
- **Achado de segurança avaliado, sem migration:**
  `goal_contributions.goal_id` não tem trigger de validação de ownership
  (diferente de `transactions.card_id`/`invoice_id`, protegidos desde a
  `0025`/`0036`). Testado: um usuário B pode inserir uma
  `goal_contributions` com `goal_id` de uma meta de outro usuário A (a
  policy de INSERT só verifica `user_id = auth.uid()`), mas como
  `recalc_goal_amount` é `SECURITY INVOKER`, a `UPDATE` que ela faz em
  `goals` roda com o privilégio de B — a RLS de `goals` bloqueia essa
  `UPDATE` cruzada (0 linhas afetadas). **Confirmado empiricamente:**
  `current_amount` da meta de A permaneceu inalterado antes/depois do
  ataque. Decisão: não criar migration — a lacuna existe mas não permite
  corromper dado de outro usuário, só criar uma linha "órfã" visível
  apenas para quem a criou. Registrado como achado revisado
  (`docs/MODULO_4.md` seção 11), não como pendência.

## 26. Empréstimos/Financiamentos

Tabelas `loans`/`loan_installments` (enum `loan_type`: `recebido`,
`concedido`) e `financings`/`financing_installments` (enum
`amortization_type`: `sac`, `price`). **UI implementada na Fase 4**
(`docs/MODULO_4.md`, Parte 4) — rota `/emprestimos`, com abas separadas
"Empréstimos"/"Financiamentos" porque o schema modela conceitos
diferentes (confirmado, não presumido): `loans` não tem coluna de
amortização e `loan_installments` não detalha juros/amortização por
parcela (parcelas fixas simples); `financings` tem `amortization: sac \|
price` e `financing_installments` guarda `amortization_amount`/
`interest_amount`/`remaining_balance` por parcela (cronograma completo).

- **`recalc_loan_balance`/`recalc_financing_balance`** (`AFTER INSERT/
  UPDATE/DELETE` nas respectivas tabelas de parcela, `SECURITY INVOKER`):
  recalculam `remaining_balance = sum(amount - paid_amount) where status
  <> 'pago'` e `status` (`quitado` se todas as parcelas estão `pago`;
  `atrasado` se qualquer parcela está `atrasado`; senão `ativo`).
- **Pagamento parcial suportado pelo schema:** `paid_amount` é uma coluna
  separada de `amount`; a fórmula de `remaining_balance` já contabiliza
  `amount - paid_amount` mesmo com `status` ainda `pendente`. Confirmado
  empiricamente (aporte parcial de 100 numa parcela de 250 recalculou
  `remaining_balance` corretamente).
- **`status = 'atrasado'` pode ser gravado diretamente** nas tabelas de
  parcela — diferente de `transactions` (bloqueado por
  `validate_transaction_status`), não há trigger de bloqueio aqui, e os
  triggers de recálculo leem esse valor gravado. Não existe job nem
  trigger que grave `atrasado` automaticamente — decisão de
  implementação da Fase 4: `loansService.list`/`financingsService.list`
  sincronizam (`UPDATE ... SET status='atrasado' WHERE status='pendente'
  AND due_date < hoje`) antes de listar, mesmo espírito de
  `generate_due_recurrences` chamada sob demanda.
- **Geração do cronograma** (SAC, Price, parcelas fixas de empréstimo)
  não tem RPC nem trigger no banco — implementada no frontend
  (`src/lib/financing-schedule.ts`), validada matematicamente (soma das
  amortizações = principal exato, saldo final = 0 exato) antes de gravar.
- **`interest_rate numeric(7,4)`** em `financings` — sem unidade
  explícita no schema; tratado como percentual por período (decisão de
  implementação, não fato do schema, documentada em `MODULO_4.md`).
- **Sem `deleted_at`** em `loans`/`financings` — exclusão é sempre física
  (segura: `*_installments.loan_id`/`financing_id` são `ON DELETE
  CASCADE`, nenhuma outra tabela referencia essas duas).
- **Achado de segurança avaliado, sem migration:**
  `loan_installments.loan_id`/`financing_installments.financing_id` não
  têm trigger de ownership (mesma ausência de `goal_contributions.goal_id`/
  `investment_movements.investment_id`). Testado e confirmado sem impacto
  real — RLS de `loans`/`financings` bloqueia a atualização cruzada
  dentro da própria trigger `SECURITY INVOKER`.

## 27. Orçamentos

Tabela `budgets` (planejado por categoria/mês/ano, `UNIQUE(user_id,
category_id, month, year)`, `category_id` FK `ON DELETE CASCADE`, 4
flags de alerta em 50/75/90/100%). **Implementado (UI completa)** na
Fase 4 — rota `/planejamento`. Nenhuma tabela referencia `budgets`
(tabela folha).

- **"Realizado" nunca é armazenado** — sempre recalculado. O frontend
  usa `v_category_summary` (mesma view do Dashboard) filtrada por
  `category_type = 'despesa'`, que é equivalente ao filtro usado pela
  trigger (`type='despesa' AND status='pago'`), porque
  `validate_transaction_references` já garante que uma categoria de
  despesa só é usada em transações `type='despesa'`. Uma query só por
  período, sem N+1.
- **`check_budget_alerts`** (`AFTER INSERT/UPDATE` em `transactions`,
  `SECURITY INVOKER`) — só reage a `type='despesa' AND status='pago' AND
  category_id IS NOT NULL`; busca o orçamento do mês/ano/categoria da
  transação e compara `spent/planned_amount` com 50/75/90/100%,
  inserindo em `notifications` (`type='orcamento_estourado'`) e marcando
  a(s) flag(s) — **em cascata** (atingir 100% de uma vez marca as 4
  flags). **Monotônico, nunca reseta**: confirmado testando que
  excluir a transação que gerou o alerta ou aumentar
  `planned_amount` depois não desmarca as flags — mesmo padrão de
  `check_goal_completion`. **Não reage a `DELETE`** de transação.
  Smoke-testado nesta sessão com valores reais (50% → 100% em um único
  salto, cascata de flags e notificação confirmadas).
- **Achado de segurança avaliado, sem migration:** `budgets.category_id`
  não tem trigger de ownership análoga a
  `validate_transaction_references` — testado empiricamente (dois
  usuários descartáveis): usuário B consegue inserir um `budgets`
  referenciando uma categoria de A. Sem impacto real: a linha pertence a
  B (`user_id=B`), RLS de `budgets` impede B de ver/alterar orçamentos de
  A, e `check_budget_alerts` casa `user_id` da transação com `user_id`
  do orçamento — a linha fantasma de B nunca é acionada por uma
  transação real de A (que só pode ser criada por A, e
  `validate_transaction_references` impede A de referenciar uma
  categoria que não seja dele, o que é irrelevante aqui pois a
  categoria É do próprio A). Mesma classe de achado de Metas/
  Investimentos/Empréstimos (seções 24-26) — RLS na trigger `SECURITY
  INVOKER` contém o dano.
- View `v_cash_flow_daily` (não usada por Orçamentos) segue pronta para
  o futuro módulo de Relatórios/fluxo de caixa.

## 28. Tags

Tabela `tags` (`UNIQUE(user_id, name)`), M:N com `transactions` via
`transaction_tags`. **Implementado (UI completa):** CRUD, cor,
associação a transações via `TagMultiSelect`, filtro de transações por
tag, contador de uso em lote (`countUsageBatch`), duplicidade bloqueada
com mensagem amigável.

## 29. Centros de custo

Tabela `cost_centers` (sem `deleted_at`, com `active` desde migration
`0035`). **Implementado (UI completa):** CRUD, ativar/desativar,
filtro por status, associação a transações, filtro de transações por
centro de custo. Centro inativo some do seletor de *novos* lançamentos
mas continua resolvendo o nome em lançamentos antigos (join direto pela
FK, que não é removida).

## 30. Auditoria

`audit_trigger_fn` (genérico, `SECURITY DEFINER`) grava em `audit_logs`:
ação, `old_data`/`new_data` em JSONB, IP, user-agent. Plugado em
`transactions`, `accounts`, `categories`, `recurring_rules`. Eventos de
autenticação (login/logout/reset de senha) são gravados manualmente pelo
frontend via `auditService`, não por trigger — não passam por
`audit_trigger_fn` porque não há tabela de domínio envolvida.

## 31. Segurança das functions

Auditoria dedicada, separada da Fase 3, documentada em
`CONTEXTO_PROJETO.md` seção 31. 11 functions `SECURITY INVOKER` criadas
nas migrations `0006`-`0008` nunca tiveram `EXECUTE` revogado de
`PUBLIC`/`anon`/`authenticated` (ao contrário do padrão já seguido pelas
functions `SECURITY DEFINER`, revogadas desde a migration `0011`):

`set_updated_at`, `apply_transaction_balance`, `apply_transfer_balance`,
`recalc_invoice_total`, `apply_investment_movement`,
`check_budget_alerts`, `check_goal_completion`,
`recalc_financing_balance`, `recalc_goal_amount`, `recalc_loan_balance`,
`_transaction_balance_effect`.

### Migration `0034_revoke_public_execute_legacy_trigger_functions`

```sql
-- 10 funções RETURNS trigger: EXECUTE revogado de PUBLIC, anon, authenticated
-- (disparo de trigger não depende de EXECUTE, então nada quebra)
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.apply_transaction_balance() from public, anon, authenticated;
revoke execute on function public.apply_transfer_balance() from public, anon, authenticated;
revoke execute on function public.recalc_invoice_total() from public, anon, authenticated;
revoke execute on function public.apply_investment_movement() from public, anon, authenticated;
revoke execute on function public.check_budget_alerts() from public, anon, authenticated;
revoke execute on function public.check_goal_completion() from public, anon, authenticated;
revoke execute on function public.recalc_financing_balance() from public, anon, authenticated;
revoke execute on function public.recalc_goal_amount() from public, anon, authenticated;
revoke execute on function public.recalc_loan_balance() from public, anon, authenticated;

-- Exceção: _transaction_balance_effect mantém EXECUTE para authenticated
-- (chamada interna via SECURITY INVOKER — ver seção 19 acima)
revoke execute on function public._transaction_balance_effect(public.transactions) from public, anon;
grant  execute on function public._transaction_balance_effect(public.transactions) to authenticated;
```

**Permissões finais** (confirmadas via `pg_proc`/`has_function_privilege`):

| Function | PUBLIC | anon | authenticated | service_role | postgres |
|---|---|---|---|---|---|
| 10 functions `RETURNS trigger` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `_transaction_balance_effect` | ❌ | ❌ | ✅ | ✅ | ✅ |

`SECURITY INVOKER` preservado nas 11, `search_path=public` (fixado desde
a migration `0011`) preservado, todos os triggers permaneceram
associados, RLS/policies inalteradas.

**Regressão financeira** executada como role `authenticated` (não
`postgres`) após a migration, 0 falhas: receita/despesa
recebida/paga/editada, soft delete + restauração, transferência entre
contas, parcelamento via RPC — todos batendo com o saldo esperado
(`CONTEXTO_PROJETO.md` seção 31.6).

### Migration `0035_cost_centers_active_flag`

```sql
alter table cost_centers add column active boolean not null default true;
```

Aditiva, sem impacto em dado existente (default `true`). Motivo: suportar
ativar/desativar centro de custo sem soft delete — a tabela não tem
`deleted_at`; exclusão continua sendo `DELETE` físico, seguro porque as
FKs de `transactions.cost_center_id`/`recurring_rules.cost_center_id`
são `ON DELETE SET NULL` (confirmado via `pg_constraint` antes da
decisão).

### Migration `0036_validate_transaction_invoice_ownership` (Fase 4)

Achado: `validate_transaction_references` já validava ownership de
`account_id`/`category_id`/`cost_center_id`/`card_id`, mas **não**
validava `invoice_id` — a FK só exigia que a fatura existisse, não que
pertencesse ao mesmo usuário. Como a Fase 4 é o primeiro módulo a popular
`invoice_id` de verdade, era uma vulnerabilidade real (mesma classe da
`0025`). Corrigido acrescentando a checagem na mesma function, mais
`drop`/`create trigger` para incluir `invoice_id` na lista de colunas que
disparam revalidação em `UPDATE`:

```sql
create or replace function public.validate_transaction_references()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
-- ... (checagens existentes de account_id/cost_center_id/card_id inalteradas) ...
  if new.invoice_id is not null and not exists (
    select 1 from public.card_invoices where id = new.invoice_id and user_id = new.user_id
  ) then
    raise exception 'Fatura inválida ou pertencente a outro usuário.';
  end if;
-- ... (checagem de category_id inalterada) ...
$function$;

drop trigger if exists trg_validate_transaction_references on public.transactions;
create trigger trg_validate_transaction_references
  before insert or update of user_id, account_id, category_id, cost_center_id, card_id, invoice_id, type
  on public.transactions
  for each row execute function public.validate_transaction_references();
```

Testado e confirmado: usuário B tentando inserir transação com
`invoice_id` de fatura do usuário A recebe `Fatura inválida ou
pertencente a outro usuário.` (`docs/MODULO_4.md` seção 6). Aplicada
com `credit_cards`/`card_invoices` em 0 linhas — sem impacto em dado
real. Aprovada pelo usuário antes de aplicar.

### Functions internas (triggers, `SECURITY DEFINER`, sem `EXECUTE` para ninguém além do disparo automático)

`audit_trigger_fn`, `handle_new_user`,
`enforce_category_type_consistency`,
`prevent_category_type_change_with_children`,
`prevent_deep_category_nesting`,
`prevent_delete_category_with_active_children`,
`prevent_last_account_delete`, `prevent_transaction_on_deleted_account`,
`validate_transaction_references`. Mais duas `SECURITY INVOKER` também
sem `EXECUTE` concedido: `normalize_transaction_paid_date`,
`validate_transaction_status`.

**Regra permanente para qualquer sessão futura:** não alterar a migration
`0034` nem revogar `EXECUTE` de `_transaction_balance_effect` para
`authenticated` sem repetir a análise completa desta seção e a bateria
de regressão financeira.

## 32. Relatórios (Fase 4) — módulo e bug real corrigido em `v_net_worth`

### Bug encontrado e corrigido: `v_net_worth` inutilizável para qualquer usuário `authenticated`

Antes de implementar o "Patrimônio" do módulo de Relatórios, `v_net_worth`
foi testada como role `authenticated` (mesma metodologia de sempre) e
falhou com:

```
ERROR: 42501: permission denied for table users
HINT: Grant the required privileges to the current role with: GRANT SELECT ON auth.users TO authenticated;
```

**Causa raiz:** a view (`SECURITY INVOKER`) fazia `FROM auth.users u` só
para enumerar o `id` do usuário atual antes de agregar `accounts`/
`investments`/`loans`/`financings` por subquery correlacionada. `authenticated`
**nunca teve** `GRANT SELECT` em `auth.users` (confirmado via
`has_table_privilege`/`has_column_privilege`, nem no nível de tabela nem
de coluna) — então, sendo `SECURITY INVOKER`, toda consulta a
`v_net_worth` como usuário real falhava.

**Impacto real, confirmado ao vivo no navegador:** o card "Patrimônio
líquido" do Dashboard (já em produção desde a Fase 3) sempre mostrou
`R$ 0,00` **silenciosamente** — `dashboardRepository.getNetWorth` lança o
erro, mas `dashboard.tsx` usa `netWorth?.net_worth ?? 0`, então a UI
nunca exibiu nem um erro visível nem o valor real. Passou despercebido
em todas as sessões anteriores porque os usuários de teste descartáveis
usados para validar Investimentos/Empréstimos/Financiamentos tinham
poucos dados e o fallback `0` coincidia, por acaso, com um resultado
plausível.

**Correção — migration `fix_v_net_worth_auth_users_permission`:**
`CREATE OR REPLACE VIEW` trocando `FROM auth.users u` por
`FROM (select auth.uid() as id) u`. `auth.uid()` já é a função usada por
toda policy de RLS do projeto, não depende de nenhum `GRANT` adicional.
Único consumidor real (`dashboardRepository.getNetWorth`, agora também
`reportsRepository.getNetWorth`) sempre filtra por
`user_id = auth.uid()` de qualquer forma — o comportamento é idêntico
para todo caller legítimo, e a view passa a **nunca poder enumerar
outro usuário**, mesmo sem o filtro `WHERE user_id = ...` (mais
restritiva que antes, não menos). Nenhuma trigger financeira crítica foi
tocada; migration puramente de leitura/agregação.

**Testado antes/depois, com usuários descartáveis:**

| Cenário | Antes | Depois |
|---|---|---|
| Usuário A consulta `v_net_worth` (SQL, role `authenticated`) | `permission denied for table users` | `total_accounts=800,00`, `net_worth=800,00` (bate com saldo real da conta) |
| Usuário A consulta via `supabase-js` real (browser, sessão real) | `error.message = "permission denied for table users"` | `error: null`, dados corretos |
| Usuário B consulta `v_net_worth` sem filtro `WHERE` (SQL) | N/A (nem A conseguia) | Só a própria linha de B (zeros) — nunca a de A |
| Usuário B consulta explicitamente `WHERE user_id = <A>` | N/A | 0 linhas |
| `get_advisors` (security) após a migration | — | Idêntico a antes, só o warning pré-existente `auth_leaked_password_protection` |
| Dashboard real (usuário de teste no navegador) | Patrimônio líquido sempre `R$ 0,00` | Reflete o saldo real das contas somado a investimentos/empréstimos/financiamentos |

### Achado documentado, não corrigido: `deleted_at` inconsistente entre as 4 views financeiras

Testado com um cenário controlado (receita R$1.000, duas despesas pagas
de R$300 e R$200, todas na mesma data) e depois excluindo (soft delete)
uma das despesas:

| View | Filtra `deleted_at IS NULL`? | Resultado após excluir a despesa de R$300 |
|---|---|---|
| `v_cash_flow_daily` | ✅ Sim | `outflow` cai de 500 para 200 (correto) |
| `v_pending_by_due_date` | ✅ Sim | (não testado neste cenário, mas filtro presente no `WHERE`) |
| `v_monthly_summary` | ❌ Não | `total_expense` permanece 500 (não reflete a exclusão) |
| `v_category_summary` | ❌ Não | `total_amount` da categoria permanece 500 (não reflete a exclusão) |
| Saldo da conta (`accounts.current_balance`, via `_transaction_balance_effect`) | ✅ Sim (`deleted_at is not null → efeito 0`) | Reflete corretamente a exclusão |

**Status `cancelado` funciona corretamente em todas as views** (filtrado
por `status IN ('pago','recebido')` ou equivalente) — só o soft delete
(`deleted_at`) tem esse comportamento inconsistente entre views.

**Decisão desta sessão:** não alterar `v_monthly_summary`/
`v_category_summary` para adicionar `deleted_at IS NULL`. Motivo: essas
duas views já são consumidas em produção pelo Dashboard (gráfico de
barras e de pizza) e agora também por Orçamento (`v_category_summary`
como "realizado") — alterar o filtro mudaria silenciosamente o
comportamento de 3 módulos já entregues, sem pedido explícito do
usuário para essa sessão (escopo era Relatórios). O módulo de Relatórios
**reutiliza deliberadamente as mesmas views** por consistência com o
Dashboard (requisito explícito: "evite cálculos divergentes do
Dashboard") — logo herda o mesmo comportamento, não diverge dele.
**Registrado como `Requer confirmação`** para uma sessão futura decidir,
com o usuário, se as 2 views devem ganhar o filtro `deleted_at IS NULL`
(o que exigiria revisar Dashboard e Orçamento juntos, não só Relatórios).

### Arquitetura do módulo

`reports.repository.ts` — ponto de contato próprio do módulo (não
importa `dashboard.repository.ts`, seguindo o padrão de nenhum
repository deste projeto importar outro), consultando as mesmas 4 views:
`v_monthly_summary` (sem filtro de período — todas as linhas do usuário,
o hook recorta o intervalo em memória, dataset naturalmente pequeno),
`v_category_summary` (um mês/ano por vez, mesmo padrão de Orçamento/
Dashboard), `v_cash_flow_daily` (intervalo de datas nativo via
`.gte`/`.lte`, já suportado pela view), `v_net_worth` (sem filtro,
sempre 1 linha).

**Invalidação:** `["reports"]` adicionada a todo hook de mutação que já
invalidava `["dashboard"]` (transações, contas, faturas de cartão,
investimentos, movimentações de investimento, recorrências) — mesmo
princípio de `["budgets"]` em `useInvalidateTransactions`. Também
corrigida uma lacuna pré-existente: `useInvalidateLoans`/
`useInvalidateFinancings` **nunca invalidavam `["dashboard"]`**, apesar
de `v_net_worth` somar `loans.remaining_balance`/
`financings.remaining_balance` — o patrimônio líquido do Dashboard podia
ficar desatualizado após pagar/quitar um empréstimo ou financiamento até
um reload manual. Corrigido junto (mesmo padrão das outras 6
invalidações, mudança de 2 linhas por arquivo).
