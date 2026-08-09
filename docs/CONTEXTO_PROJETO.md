# Contexto do Projeto — Meu Financeiro

> Documento de handoff entre sessões. Escrito ao final da sessão que
> **concluiu a Fase 3**. Todos os dados abaixo foram verificados diretamente
> no banco de produção (`execute_sql`) e no repositório local no momento da
> escrita — não são recordados de memória.
>
> **Última atualização:** 2026-08-09, sessão que implementou o quinto e
> último módulo da Fase 4 (Orçamentos). Ver seção 34 e `docs/MODULO_4.md`
> Parte 5. Seções 33 documentam os módulos anteriores da Fase 4 (Cartões,
> Metas, Investimentos, Empréstimos/Financiamentos).

---

## 1. Estado atual em uma frase

**FASE 3 CONCLUÍDA e commitada** (`58936f2`, `216e2b4`, `e629d8e`, enviados
para `origin/develop`). **FASE 4 CONCLUÍDA:** Cartões/Faturas, Metas,
Investimentos, Empréstimos/Financiamentos e Orçamentos implementados e
testados (ver seções 33-34). Contas (Fase 1), Categorias (Fase 2),
Receitas/Despesas (Fase 3, incluindo recorrências, anexos, tags, centros de
custo e dashboard com dados reais) e todos os módulos da Fase 4 estão
implementados, testados (funcional, financeiro, segurança multiusuário,
dark mode, responsividade) e com 0 erros de TypeScript/ESLint e build
funcionando. Restam Calendário, Relatórios e Configurações (Fase 4,
ver `docs/HANDOFF_CONTINUIDADE.md`).

---

## 2. Stack utilizada

| Camada | Tecnologia |
|---|---|
| Build | Vite 8 |
| Framework | React 19 + TypeScript (strict) |
| Estilo | TailwindCSS v4 + shadcn/ui (estilo "new-york", Radix primitives) |
| Roteamento | React Router v7 |
| Dados/servidor | TanStack Query v5 |
| Formulários | React Hook Form + Zod |
| Drag-and-drop | @dnd-kit (core, sortable, utilities) |
| Gráficos | Recharts |
| Ícones | lucide-react |
| Backend | Supabase (Postgres 17.6, Auth, Storage) |
| Toasts | sonner |
| Lint/format | ESLint (flat config) + Prettier |

Projeto Supabase: **`financeiro-leonardo`**, ref `xocehjrujmaxhwqhxelo`,
região `sa-east-1`, organização `cssqqcuqapqhrsjmuajd`, plano free ($0/mês).

---

## 3. Arquitetura atual

```
src/
  components/
    ui/            componentes shadcn/ui gerados (não editar manualmente)
    layout/        Sidebar, Header, MobileSidebar, NotificationsBell, GlobalSearch, UserMenu, ThemeToggle
    shared/        genéricos reutilizáveis entre módulos (ver seção 12)
    auth/          ProtectedRoute, GuestRoute
    accounts/      componentes exclusivos do módulo Contas
    categories/    componentes exclusivos do módulo Categorias
    transactions/  componentes exclusivos do módulo Transações (Fase 3)
  pages/           uma pasta por rota (accounts, categories, transactions, dashboard, auth/*, e 10 placeholders "ComingSoon")
  layouts/         AppLayout (autenticado), AuthLayout
  hooks/           um hook por necessidade de dados/UI (ver seção 13)
  services/        camada fina entre hooks e repositories (ver seção 14)
  repositories/    único ponto de chamada ao Supabase por entidade (ver seção 15)
  schemas/         validação Zod por formulário
  types/           database.types.ts (gerado) + index.ts (aliases de domínio)
  constants/       nav.ts, colors.ts, icon-registry.ts
  contexts/        AuthContext (+ auth-context-value.ts separado por causa de Fast Refresh)
  providers/       ThemeProvider (next-themes), QueryProvider
  lib/             supabase.ts (client), format.ts, errors.ts, utils.ts (cn), category-tree.ts
docs/              documentação do projeto (ver seção 4 abaixo desta lista)
```

**Padrão obrigatório por módulo:** `repository` (só supabase-js) → `service`
(passthrough hoje, ponto de extensão futuro) → `hook` (TanStack Query,
invalidação de cache) → `component`/`page`. Nenhuma tela chama `supabase`
diretamente.

**Padrão de remount de formulário:** todo diálogo de criar/editar recebe uma
prop `key={formKey}` do pai, incrementada a cada abertura. Isso existe porque
descobrimos em produção que resetar via `useEffect` deixava estado antigo
vazar entre aberturas consecutivas (bug real, corrigido no Módulo 1).

**Padrão de soft delete:** toda entidade principal tem `deleted_at`. Nunca é
feito `DELETE` de dado do usuário — sempre `UPDATE deleted_at = now()`, com
tela de lixeira e restauração.

Arquivos de documentação hoje existentes em `docs/`:
- `docs/MODULO_3.md` — decisões técnicas detalhadas da Fase 3
- `docs/CONTEXTO_PROJETO.md` — este arquivo

**Ainda não existem:** `docs/ARQUITETURA.md`, `docs/BANCO_DE_DADOS.md`,
`docs/REGRAS_DE_NEGOCIO.md` (pendência, seção 28).

---

## 4. Estrutura do Supabase — visão geral

24 tabelas em `public`, todas com RLS habilitado. 35 migrations aplicadas
(`0001` a `0035`). 7 views. 1 bucket de Storage. Extensão `pg_trgm` isolada no
schema `extensions` (não em `public`).

### 4.1 Tabelas (schema `public`)

| Tabela | Linhas atuais | Observação |
|---|---|---|
| `profiles` | 1 | Estende `auth.users` |
| `accounts` | 1 | Módulo 1. Soft delete, reconciliação |
| `account_reconciliations` | 0 | Histórico de reconciliação |
| `categories` | 16 | Módulo 2. Soft delete, hierarquia 1 nível, `sort_order` |
| `cost_centers` | 0 | CRUD completo (Fase 3, finalização). Ganhou coluna `active` (migration `0035`) |
| `tags` | 0 | CRUD completo (Fase 3, finalização) |
| `credit_cards`, `card_invoices` | 0 | Schema pronto, módulo futuro |
| `recurring_rules` | 0 | Fase 3, finalização. Tela de gestão completa |
| `transactions` | 0 | Fase 3. Núcleo dos lançamentos — ver seção 6 |
| `transaction_tags` | 0 | M:N transações↔tags |
| `attachments` | 0 | Polimórfica (`entity_type`+`entity_id`), Módulo 1 |
| `transfers` | 0 | Schema pronto, sem UI (módulo futuro) |
| `subscriptions`, `investments`, `investment_movements` | 0 | Schema pronto, módulos futuros |
| `loans`, `loan_installments`, `financings`, `financing_installments` | 0 | Schema pronto, módulos futuros |
| `goals`, `goal_contributions`, `budgets` | 0 | Schema pronto, módulos futuros |
| `notifications` | 0 | Schema pronto, sem central de notificações |
| `audit_logs` | 4 | 2 logins reais + 2 updates do meu script de limpeza final (ver seção 23) |

### 4.2 Enums

`account_type`, `account_status`, `category_type`, `transaction_type`
(`receita`, `despesa` — **de propósito só esses dois**, ver seção 8.1),
`transaction_status` (`pendente`,`pago`,`recebido`,`cancelado`,`atrasado` —
`atrasado` existe no enum mas a trigger `validate_transaction_status` proíbe
gravá-lo; é sempre derivado, nunca armazenado), `payment_method`,
`recurrence_frequency` (agora com `bimestral`,`trimestral`,`semestral`
adicionados na Fase 3), `priority_level`, `card_brand`, `invoice_status`,
`billing_cycle`, `investment_type`, `investment_movement_type`, `loan_type`,
`loan_status`, `installment_status`, `amortization_type`, `notification_type`.

---

## 5. Migrations (33 aplicadas, nenhuma apagada)

| Faixa | Fase | Conteúdo |
|---|---|---|
| `0001`–`0012` | Fase 1 | Schema completo inicial (todas as 20+ tabelas do domínio), triggers de saldo/updated_at, seed de signup, RLS inicial, views de relatório, hardening de segurança |
| `0013`–`0020` | Módulo 1 (Contas) | Auditoria genérica, soft delete de contas, anexos polimórficos, bucket de Storage, RPC de reconciliação |
| `0021`–`0023` | Módulo 2 (Categorias) | Soft delete + `sort_order`, RLS otimizado, trigger de não-alterar-tipo-com-filhos |
| `0024`–`0033` | Fase 3 (Transações) | Ver detalhamento completo em `docs/MODULO_3.md` |
| `0034` | Hardening (pós-Fase 3) | `revoke execute` de least-privilege nas 11 functions legadas de saldo/updated_at/recálculo. Ver seção 31 |
| `0035` | Finalização Fase 3 | `alter table cost_centers add column active boolean not null default true` — suporta ativar/desativar na UI. Ver seção 32 |

Convenção: nome sequencial `NNNN_descricao_curta`, aplicadas via
`apply_migration` do MCP do Supabase (nunca `execute_sql` para DDL
permanente).

---

## 6. Estado da tabela `transactions`

Reaproveitada da Fase 1 — **nunca foi recriada**. Colunas atuais (27 no
total), na ordem física:

```
id uuid PK · user_id uuid NOT NULL · type transaction_type NOT NULL
description text NOT NULL · amount numeric NOT NULL (CHECK > 0, sempre positivo)
category_id uuid · account_id uuid · cost_center_id uuid
supplier text · payment_method payment_method · card_id uuid · invoice_id uuid
date date NOT NULL (default current_date) · due_date date · paid_date date
status transaction_status NOT NULL (default 'pendente')
recurring_id uuid · installment_group_id uuid
installment_number smallint · installment_total smallint
notes text · created_at timestamptz · updated_at timestamptz
is_adjustment boolean NOT NULL (default false)   -- Módulo 1, ajuste de reconciliação
deleted_at timestamptz                           -- Fase 3
currency char(3) NOT NULL default 'BRL'          -- Fase 3, preparado p/ multi-moeda (não implementada)
```

**Sinal do valor:** vem exclusivamente de `type`. `amount` é sempre positivo
(constraint `chk_transactions_amount_positive`).

**Índices (12):** PK, `user_id`, `account_id`, `category_id`, `card_id`,
`date`, `status`, `installment_group_id`, `cost_center_id`, `recurring_id`,
`invoice_id`, `deleted_at`, e o composto `(user_id, date desc, id desc)`
parcial (`deleted_at is null`) que sustenta a listagem principal, mais
`(user_id, due_date) partial` para vencimentos, `(user_id, deleted_at desc)
partial` para lixeira, `(user_id, paid_date) partial` para agregações. Três
índices GIN trigram (`description`, `supplier`, `notes`) para busca `ILIKE`.

---

## 7. Triggers existentes

### Em `transactions` (5 ativos + 2 novos da Fase 3):
| Trigger | Function | Evento |
|---|---|---|
| `trg_transactions_balance` | `apply_transaction_balance` | AFTER I/U/D — aplica delta no saldo da conta |
| `trg_recalc_invoice_total` | `recalc_invoice_total` | AFTER I/U/D — recalcula total da fatura |
| `trg_check_budget_alerts` | `check_budget_alerts` | AFTER I/U — dispara notificação de orçamento |
| `trg_set_updated_at` | `set_updated_at` | BEFORE U |
| `trg_prevent_transaction_on_deleted_account` | `prevent_transaction_on_deleted_account` | BEFORE I/U de `account_id` |
| `trg_normalize_transaction_paid_date` | `normalize_transaction_paid_date` | BEFORE I/U — Fase 3: sincroniza `paid_date` com `status` |
| `trg_validate_transaction_references` | `validate_transaction_references` | BEFORE I/U — Fase 3: valida ownership de conta/categoria/centro de custo/cartão |
| `trg_validate_transaction_status` | `validate_transaction_status` | BEFORE I/U — Fase 3: impede gravar `atrasado`, impede receita=pago/despesa=recebido |
| `trg_audit_transactions` | `audit_trigger_fn` | AFTER I/U/D — Fase 3: plugou a auditoria genérica nesta tabela |

### Em `accounts`: `trg_set_updated_at`, `trg_prevent_last_account_delete`,
`trg_audit_accounts`.

### Em `categories`: `trg_set_updated_at`,
`trg_prevent_deep_category_nesting`, `trg_enforce_category_type_consistency`,
`trg_prevent_delete_category_with_active_children`,
`trg_prevent_category_type_change_with_children`, `trg_audit_categories`.

### Em `recurring_rules` (Fase 3): `trg_audit_recurring_rules`.

### Outras tabelas (Fase 1, não tocadas): triggers de saldo de transferência,
recálculo de fatura/investimento/empréstimo/financiamento/meta, todos
funcionando como antes.

**IMPORTANTE — bug real que causei e corrigi durante a Fase 3:** a migration
`0015` (attachments polimórficos, Módulo 1) continha por engano a linha `drop
trigger if exists trg_recalc_invoice_total on public.transactions`, que
removeu esse trigger sem eu perceber na hora. Foi detectado e corrigido na
migration `0016_fix_restore_invoice_total_trigger` **na mesma sessão em que
o bug foi introduzido**. Confirmado hoje: o trigger está ativo (listado
acima). Não é uma pendência — é um bug histórico já resolvido, registrado
aqui só para rastreabilidade.

---

## 8. Functions / RPCs

Auditoria de segurança executada hoje (`pg_proc` + `has_function_privilege`)
sobre todas as 27 functions de `public`:

| Function | SECURITY | EXECUTE liberado para |
|---|---|---|
| `create_installment_transactions` | INVOKER | `authenticated` apenas |
| `generate_due_recurrences` | INVOKER | `authenticated` apenas |
| `reconcile_account` | INVOKER | `authenticated` apenas |
| `reorder_categories` | INVOKER | `authenticated` apenas |
| `_next_recurrence_date` | INVOKER | `authenticated` apenas |
| `audit_trigger_fn`, `handle_new_user`, `enforce_category_type_consistency`, `prevent_category_type_change_with_children`, `prevent_deep_category_nesting`, `prevent_delete_category_with_active_children`, `prevent_last_account_delete`, `prevent_transaction_on_deleted_account`, `validate_transaction_references` | DEFINER | ninguém (revogado de anon/authenticated — só disparam via trigger) |
| `normalize_transaction_paid_date`, `validate_transaction_status` | INVOKER | ninguém (revogado) |
| **`_transaction_balance_effect`, `apply_transaction_balance`, `apply_transfer_balance`, `apply_investment_movement`, `check_budget_alerts`, `check_goal_completion`, `recalc_financing_balance`, `recalc_goal_amount`, `recalc_invoice_total`, `recalc_loan_balance`, `set_updated_at`** | INVOKER | ⚠️ **`authenticated,anon`** — nunca foram revogadas explicitamente na Fase 1 |

✅ **Achado de segurança corrigido nesta sessão** (era pendência da sessão
anterior): as 11 functions da última linha tinham `EXECUTE` liberado por
padrão para `anon`/`authenticated` via `PUBLIC`, nunca revogado
explicitamente desde a criação (migrations `0006`-`0008`). Corrigido pela
migration `0034_revoke_public_execute_legacy_trigger_functions`. Ver seção
31 para a análise completa, a exceção crítica encontrada e a bateria de
testes de regressão financeira executada antes de declarar a correção
concluída.

---

## 9. Views (7)

| View | Origem | Função |
|---|---|---|
| `v_monthly_summary` | Fase 1 | Receita/despesa/saldo por mês |
| `v_category_summary` | Fase 1 | Gasto por categoria por mês |
| `v_net_worth` | Fase 1/Módulo 1 | Patrimônio líquido (contas+investimentos+empréstimos−financiamentos), já filtra `deleted_at` |
| `v_card_usage` | Fase 1 | Limite usado/disponível por cartão |
| `v_transactions_enriched` | **Fase 3** | Listagem principal: junta categoria/subcategoria/conta/centro de custo, agrega `tags` (jsonb) e `tag_ids` (uuid[]), deriva `is_overdue` e `effective_status` |
| `v_cash_flow_daily` | **Fase 3** | Entradas/saídas/líquido por dia liquidado — base pronta para o futuro módulo de Fluxo de Caixa |
| `v_pending_by_due_date` | **Fase 3** | Contas a pagar/receber agrupadas por vencimento |

Todas com `security_invoker = true` (respeitam RLS das tabelas base, não
vazam dados entre usuários).

---

## 10. RLS e Policies

Todas as 24 tabelas têm RLS habilitado. Padrão: 4 policies por tabela
(select/insert/update/delete), condição `user_id = (select auth.uid())`. A
forma com `(select ...)` (em vez de `auth.uid()` solto) foi adotada
deliberadamente nas Fases 2 e 3 para performance (elimina o warning
`auth_rls_initplan` do advisor — avaliado 1x por query, não 1x por linha).
Tabelas do Módulo 1 e da Fase 1 anteriores a essa mudança **ainda usam a
forma antiga** e não foram retroativamente otimizadas (não é bug, é apenas
uma otimização não propagada — candidata a limpeza futura).

Tabelas sem `user_id` direto (`transaction_tags`) usam subquery validando o
dono da transação e da tag.

**Testes de RLS executados na Fase 3** (usuário simulado via
`set_config('request.jwt.claims', ...)`): SELECT, UPDATE, DELETE de
transação alheia = 0 linhas afetadas em todos os casos. INSERT usando
`account_id` de outro usuário = bloqueado pela trigger de ownership (não
apenas pelo RLS). RPC `reorder_categories` chamada com IDs de outro usuário =
no-op silencioso, sem vazar existência do registro.

**Vulnerabilidade real encontrada e corrigida na Fase 3:** a policy de INSERT
de `transactions` validava somente `user_id`, mas não verificava que
`account_id`/`category_id`/`cost_center_id`/`card_id` pertenciam ao mesmo
usuário. Um usuário conseguia inserir uma transação apontando para a conta de
outro usuário (sem corromper o saldo alheio, mas gerando um vínculo inválido
e saldo próprio incorreto). Corrigido com a trigger
`validate_transaction_references` (migration `0025`). Testado e confirmado
bloqueado.

---

## 11. Storage

Um único bucket: **`attachments`** — privado (`public: false`), limite de 10
MB por arquivo, MIME permitidos: `image/jpeg`, `image/png`, `image/webp`,
`image/heic`, `application/pdf`. Policies de `storage.objects` restringem
cada usuário à própria pasta (`{user_id}/...` via `storage.foldername`).
Tabela `attachments` é polimórfica (`entity_type` + `entity_id`), hoje usada
apenas pelo módulo Contas — **ainda não plugada no formulário de transações**
(pendência, seção 28).

---

## 12. Componentes reutilizáveis (`src/components/shared/`)

| Componente | Uso |
|---|---|
| `EmptyState` | Estado vazio genérico (ícone+título+descrição+ação opcional). Usado em Contas, Categorias e Transações |
| `ConfirmDialog` | AlertDialog de confirmação genérico (usado em exclusões e cancelamentos) |
| `PaginationBar` | Paginação por offset com contagem (usada em Contas e Transações) |
| `CurrencyInput` | Máscara de moeda BRL, sincroniza o DOM no próprio evento para não acumular dígitos sob digitação rápida (bug real corrigido no Módulo 1) |
| `IconPicker` / `ColorPicker` | Seletores genéricos, alimentados por `constants/icon-registry.ts` e `constants/colors.ts` |
| `DynamicIcon` | Renderiza um ícone lucide a partir de uma string salva no banco |
| `AttachmentsPanel` + `FileUploadDropzone` | Upload/list/remove de anexos via Storage (usado hoje só em Contas) |
| `KpiCard` | Card de indicador do dashboard/telas de listagem |

`src/hooks/use-sortable-list.ts` também é compartilhado: sensores de
ponteiro **e teclado** do dnd-kit (o teclado foi adicionado depois — a
primeira versão só tinha ponteiro e quebrava acessibilidade).

---

## 13. Hooks

| Hook | Módulo |
|---|---|
| `useAuth`, `useDebounce`, `useLocalStorage` | Genéricos |
| `useDashboard`, `useNotifications` | Fase 1 |
| `useAccounts`, `useAccountHistory`, `useAttachments` | Módulo 1 |
| `useCategories` (inclui árvore, lixeira com resolução de pai, reorder) | Módulo 2 |
| `useTransactions` (list/totals/create/update/setStatus/softDelete/restore/trash-count), `useTransactionLookups` (contas/categorias-por-tipo/tags/centros de custo ativos para o formulário) | Fase 3 |
| `useRecurringRules` (list/trashed/stats/create/update/setActive/end/softDelete/restore/generateDue), `useTags` (list/usage-batch/create/update/delete), `useCostCenters` (list/usage-batch/create/update/setActive/delete), `useDashboard` (agora aceita `DashboardPeriod` navegável) | **Fase 3, finalização** |

`useTransactions` centraliza a invalidação de cache: qualquer mutação
invalida `transactions`, `accounts` (saldo), `dashboard` e `recurring-rules`
de uma vez — decisão deliberada para nunca esquecer uma superfície afetada.

---

## 14. Services

Camada fina hoje (repassa para o repository), existe para não violar a
arquitetura em camadas e dar um ponto único de extensão futuro:
`accounts.service.ts`, `categories.service.ts`, `attachments.service.ts`,
`audit.service.ts`, `dashboard.service.ts`, `notifications.service.ts`,
`transactions.service.ts` (este último já tem lógica real: decide entre
lançamento simples / parcelamento via RPC / criação de regra de recorrência),
`recurring-rules.service.ts`, `tags.service.ts`, `cost-centers.service.ts`
(novos na finalização da Fase 3 — `use-transaction-lookups.ts` também foi
migrado para chamar `tagsService`/`costCentersService` em vez do repository
direto, por consistência).

---

## 15. Repositories

Um por entidade, único ponto de chamada ao `supabase-js`:
`accounts.repository.ts`, `account-history.repository.ts`,
`attachments.repository.ts`, `audit-logs.repository.ts`,
`categories.repository.ts`, `dashboard.repository.ts`,
`notifications.repository.ts`, `search.repository.ts` (busca global do
header), e da Fase 3: `transactions.repository.ts` (list com todos os
filtros, totals, create, update, createInstallments via RPC, setStatus,
softDelete, restore, softDeleteInstallmentGroup, countTrashed),
`recurring-rules.repository.ts`, `tags.repository.ts`,
`cost-centers.repository.ts`.

---

## 16. O que foi implementado na Fase 1

Fundação completa: scaffold Vite+React+TS, TailwindCSS v4 + shadcn/ui, schema
inicial do banco (20+ tabelas do domínio inteiro, migrations `0001`-`0012`),
autenticação Supabase (login/cadastro/recuperação de senha), RLS inicial em
todas as tabelas, layout (sidebar recolhível, dark/light/auto, busca global
Ctrl+K, notificações), dashboard com dados reais das views de relatório.
**Bug crítico encontrado e corrigido nesta fase:** `tw-animate-css` não
instalava corretamente no ambiente (pasta `dist` ausente do pacote no
registry usado); sem ele, todo Dialog/Select/DropdownMenu do app ficava com
overlay invisível bloqueando cliques após o primeiro fechamento. Substituído
por implementação própria das keyframes de animação em `index.css`.

## 17. O que foi implementado na Fase 2

CRUD completo de Categorias e Subcategorias (1 nível de profundidade),
drag-and-drop de ordenação com @dnd-kit (ponteiro + teclado), lixeira com
resolução de nome do pai para subcategorias órfãs, regras de negócio via
trigger (tipo da subcategoria = tipo do pai; não pode excluir pai com filhos
ativos; não pode mudar tipo com filhos ativos; nome único por
usuário+tipo+pai), auditoria completa, RLS otimizado com `(select
auth.uid())`. **Bug real corrigido:** trocar de tema deixava linhas com a cor
do tema anterior indefinidamente (elementos com `transition-colors` presos);
corrigido com `disableTransitionOnChange` no `ThemeProvider` — também
beneficiou retroativamente o Módulo 1.

## 18. O que foi implementado na Fase 3 (parcial)

Ver detalhamento completo em `docs/MODULO_3.md`. Resumo: núcleo de
lançamentos (receita/despesa unificados em `transactions`), saldo via
extensão do trigger de delta existente (soft delete e restore corretos sem
código novo), parcelamento atômico com rateio sem perda de centavos,
recorrências por regra com geração sob demanda (RPC idempotente), status
`atrasado` sempre derivado, validação de ownership entre usuários (trigger
nova), views enriquecidas, formulário unificado com seção avançada
expansível, tela central de transações com abas/filtros/busca/paginação por
offset.

---

## 19. Bugs encontrados e corrigidos (todas as fases)

| # | Fase | Bug | Correção |
|---|---|---|---|
| 1 | 1 | `tw-animate-css` sem pasta `dist` no ambiente → overlay de Dialog bloqueava cliques após 1º fechamento | Animações reimplementadas manualmente em `index.css` |
| 2 | 1 | Migration `0015` removeu acidentalmente `trg_recalc_invoice_total` | Corrigido na migration seguinte (`0016`), mesma sessão |
| 3 | 1 | `CurrencyInput` acumulava dígitos sob digitação rápida | Sincroniza o DOM dentro do próprio handler de evento |
| 4 | 1 | Formulário de conta não resetava entre aberturas consecutivas ("Nova conta" reaproveitava estado da anterior) | Padrão `key={formKey}` incrementado a cada abertura, adotado em todos os módulos depois |
| 5 | 2 | Troca de tema deixava linhas com cor antiga presa (elementos com `transition-colors`) | `disableTransitionOnChange` no `ThemeProvider` |
| 6 | 3 | Soft delete de transação zeraria/duplicaria efeito no saldo se implementado ingenuamente | `_transaction_balance_effect` retorna 0 quando `deleted_at is not null`; delta cuida do resto |

## 20. Vulnerabilidades encontradas e corrigidas

| # | Fase | Vulnerabilidade | Correção | Status |
|---|---|---|---|---|
| 1 | 3 | INSERT em `transactions` validava só `user_id`, não `account_id`/`category_id`/`cost_center_id`/`card_id` — usuário A podia referenciar dado do usuário B | Trigger `validate_transaction_references` (migration `0025`) | ✅ Corrigido e testado |
| 2 | 3 | `pg_trgm` instalado no schema `public` (exposição desnecessária) | Movido para schema `extensions` (migration `0032`) | ✅ Corrigido |
| 3 | 1 (achado numa sessão, corrigido na seguinte) | 11 functions de saldo/updated_at/recálculo com `EXECUTE` ainda liberado para `anon`/`authenticated` via `PUBLIC` | Migration `0034_revoke_public_execute_legacy_trigger_functions` — `revoke execute` explícito, com exceção mantida para `_transaction_balance_effect`/`authenticated` (ver seção 31) | ✅ Corrigido e testado (11/11 funções validadas como role `authenticated`, 0 regressões) |

---

## 21. Testes realizados (Fase 3)

- **Cenários financeiros de saldo** (8 sequenciais no banco): receber,
  editar valor, cancelar, editar de novo, soft delete, restaurar, reativar
  cancelada, voltar para pendente — todos batendo com o valor esperado.
- **Parcelamento:** 100/3, 1200/12, 99.99/1, 1000/24 — soma sempre igual ao
  total, sem perda de centavos.
- **Integridade (7 tentativas maliciosas via SQL direto):** categoria
  incompatível (ambos sentidos), categoria de transferência em
  receita/despesa, conta de outro usuário, receita com status `pago`, gravar
  `atrasado` diretamente, valor negativo — todas bloqueadas com mensagem
  clara.
- **RLS multiusuário:** SELECT/UPDATE/DELETE de transação alheia (0 linhas em
  todos os casos), INSERT usando conta alheia (bloqueado), RPC de reorder com
  ID alheio (no-op).
- **Fluxo no navegador:** criar receita (saldo 0→500), criar despesa
  parcelada 3x pela UI (rateio correto, vencimentos mensais), marcar parcela
  como paga (saldo 500→466,66), excluir lançamento (saldo revertido para
  −33,34), toasts corretos, console sem erros.

## 22. Resultados dos testes

TypeScript: **0 erros**. ESLint: **0 erros**, 4 warnings (todos
pré-existentes em arquivos gerados pelo shadcn/ui, categoria
`react-refresh/only-export-components`, não relacionados à Fase 3). Build de
produção: **sucesso**, ~29s, bundle 1,41 MB / 404 KB gzip (aviso de chunk
grande — otimização futura via code splitting, não bloqueante).

**Não testados ainda** (ver seção 28): duplicar lançamento, busca textual,
filtros avançados, ordenação por cada coluna, paginação com múltiplas
páginas, dark mode e responsividade mobile da tela de Transações
especificamente (os componentes reutilizados já foram validados em outras
telas, mas a tela nova em si não passou por esse teste específico).

## 23. Dados de teste removidos

Confirmado agora, diretamente no banco: `transactions` = 0 linhas,
`recurring_rules` = 0 linhas, saldo da única conta = 0,00, `categories` = 16
(as 16 padrão de sempre, nenhuma de teste sobrando). `audit_logs` tem 4
linhas — **não são lixo de teste**: 2 são logins reais da conta de teste
(`teste.financeiro.leonardo@gmail.com`) durante a sessão de QA, e 2 são
`update accounts` gerados pelo próprio script SQL de limpeza final (o
`UPDATE ... SET current_balance = initial_balance` passou pela trigger de
auditoria). Deixados como estão por serem trilha de auditoria legítima, não
dado fictício.

---

## 24. Estado atual do Git

```
* develop
```

Sem commits novos desde `eb92bfa feat: initial finance management system`.
**Nenhum commit foi feito durante a Fase 3**, conforme instrução explícita do
usuário em todas as sessões.

## 25. Branch atual

`develop` (única branch local usada até agora).

## 26. Arquivos modificados (não commitados)

Estado após a sessão de finalização da Fase 3 (confirmado via `git status`):

```
M src/App.tsx                              (rotas: import + <Route path="/tags">)
M src/components/shared/attachments-panel.tsx  (fix: type="button" nos 2 botões)
M src/constants/icon-registry.ts           (COST_CENTER_ICON_OPTIONS)
M src/constants/nav.ts                     (item "Tags" no menu)
M src/hooks/use-dashboard.ts               (DashboardPeriod navegável, novas queries)
M src/lib/errors.ts                        (mensagem amigável p/ tags_user_id_name_key)
M src/pages/cost-centers/cost-centers.tsx  (ComingSoon → página completa)
M src/pages/dashboard/dashboard.tsx        (dados reais + navegação de período)
M src/pages/recurring/recurring.tsx        (ComingSoon → página completa)
M src/pages/transactions/transactions.tsx  (Fase 3 original)
M src/repositories/dashboard.repository.ts (views novas + getPendingSummary)
M src/services/dashboard.service.ts        (getPendingSummary)
M src/types/database.types.ts              (regenerado após migration 0035 — cost_centers.active)
M src/types/index.ts                       (aliases da Fase 3 original)
```

## 27. Arquivos novos (não commitados)

```
docs/
  MODULO_3.md
  CONTEXTO_PROJETO.md                      (este arquivo)
src/components/
  transactions/  (category-select, tag-multi-select, transaction-form-dialog,
                  transaction-row, transactions-filters — Fase 3 original)
  recurring/     (recurring-rule-form-dialog.tsx, recurring-rule-row.tsx)
  tags/          (tag-form-dialog.tsx, tag-row.tsx)
  cost-centers/  (cost-center-form-dialog.tsx, cost-center-row.tsx)
src/hooks/
  use-transaction-lookups.ts, use-transactions.ts        (Fase 3 original)
  use-recurring-rules.ts, use-tags.ts, use-cost-centers.ts  (finalização)
src/pages/
  tags/tags.tsx                            (nova rota)
src/repositories/
  cost-centers.repository.ts, recurring-rules.repository.ts,
  tags.repository.ts, transactions.repository.ts
src/schemas/
  transaction.schema.ts                    (Fase 3 original)
  recurring-rule.schema.ts, tag.schema.ts, cost-center.schema.ts  (finalização)
src/services/
  transactions.service.ts                  (Fase 3 original)
  recurring-rules.service.ts, tags.service.ts, cost-centers.service.ts  (finalização)
```

---

## 28. Pendências da Fase 3 — todas resolvidas (ver seção 32)

Lista histórica, mantida para rastreabilidade. Todos os 7 itens abaixo foram
resolvidos na sessão de finalização (2026-08-08):

1. ~~Tela de recorrências ausente~~ — ✅ implementada (`/recorrencias`).
2. ~~Anexos não plugados no formulário de transação~~ — ✅ integrados.
3. ~~Dashboard não atualizado~~ — ✅ usa as 3 views novas + navegação de período.
4. ~~Sem CRUD de Tags~~ — ✅ implementado (`/tags`).
5. ~~Sem CRUD de Centros de Custo~~ — ✅ implementado (`/centro-de-custos`).
6. **Documentação complementar (`ARQUITETURA.md`, `BANCO_DE_DADOS.md`,
   `REGRAS_DE_NEGOCIO.md`) ainda não criada** — única pendência real que
   sobra; não bloqueia a conclusão funcional da fase (ver seção 32.9).
7. ~~Testes de UI não realizados~~ — ✅ duplicar, busca, filtros (incl.
   centro de custo/tags), status, exclusão/restauração testados.

Achado de segurança da seção 8 (11 functions com `EXECUTE` aberto): ✅
corrigido numa sessão dedicada de hardening (migration `0034`, seção 31).

---

## 29. Decisão arquitetural registrada: paginação por offset

Adotada na Fase 3 para a listagem de transações. **Offset com contagem
exata**, não cursor/keyset.

**Motivo:** o requisito de produto era mostrar "página X de Y" e o total de
resultados — informação que um cursor puro não fornece (ele não sabe o total
nem permite pular direto para uma página arbitrária). Para o volume esperado
de um app financeiro de uso pessoal (milhares, não milhões, de lançamentos
por usuário), offset sobre o índice parcial `(user_id, date desc, id desc)`
tem custo aceitável.

**Caminho de migração se o volume crescer:** trocar para paginação
keyset/cursor com scroll infinito (sem contagem total, sem salto de página),
usando `(date, id)` como cursor composto — o mesmo índice já serve para os
dois modelos.

---

## 30. Próxima sessão — por onde retomar

1. Ler este arquivo e `docs/MODULO_3.md` por completo antes de tocar em
   qualquer código.
2. Fase 3 está concluída (seção 32). A única pendência real que sobra é
   documentação complementar (`ARQUITETURA.md`, `BANCO_DE_DADOS.md`,
   `REGRAS_DE_NEGOCIO.md`) — não bloqueante.
3. Próximo passo de produto: decidir com o usuário qual módulo da Fase 4
   iniciar (Cartões/Faturas, Investimentos, Empréstimos/Financiamentos,
   Metas ou Planejamento — todos com schema pronto desde a Fase 1, nenhum
   com UI ainda).
3. ~~Corrigir o achado de segurança da seção 8~~ — feito (migration `0034`,
   seção 31).
4. Só marcar "FASE 3 — CONCLUÍDA" quando os 7 itens da seção 28 estiverem
   resolvidos e testados.

---

## 31. Auditoria e hardening de EXECUTE nas 11 functions legadas

Executado em sessão dedicada, separada da Fase 3, a pedido explícito do
usuário: primeiro uma auditoria completa (sem alterar nada), depois — após
aprovação — a correção.

### 31.1 Achado

As 11 functions abaixo (todas `SECURITY INVOKER`, criadas nas migrations
`0006`-`0008`) nunca tiveram o `EXECUTE` padrão do Postgres revogado de
`PUBLIC`/`anon`/`authenticated`, ao contrário do padrão já seguido pelas
outras functions `SECURITY DEFINER` do projeto (essas sim revogadas desde a
migration `0011`):

`set_updated_at`, `apply_transaction_balance`, `apply_transfer_balance`,
`recalc_invoice_total`, `apply_investment_movement`, `check_budget_alerts`,
`check_goal_completion`, `recalc_financing_balance`, `recalc_goal_amount`,
`recalc_loan_balance`, `_transaction_balance_effect`.

### 31.2 Análise de risco (antes da correção)

10 das 11 são `RETURNS trigger` — o Postgres impede estruturalmente a
chamada direta desse tipo de function via SQL/RPC (erro `"trigger functions
can only be called as triggers"`), **independente do `EXECUTE`**. Na prática
o grant aberto era inerte para essas 10. A exceção é `_transaction_balance_effect`
(`RETURNS numeric`), tecnicamente invocável direto por qualquer
`anon`/`authenticated` — mas é uma function pura (sem leitura de tabela, sem
side effect), então o grant aberto não expunha dado nem permitia escrita.
Risco real: baixo a nulo. Mesmo assim, manter esses grants abertos era um
desvio do padrão de menor privilégio do projeto e um risco *latente* (se
qualquer uma dessas functions fosse um dia refatorada para virar uma RPC
chamável, o grant aberto passaria a valer de fato).

### 31.3 Exceção crítica encontrada

`_transaction_balance_effect` é chamada explicitamente de dentro de
`apply_transaction_balance` (`public._transaction_balance_effect(new)`).
Como `apply_transaction_balance` é `SECURITY INVOKER`, essa chamada interna
roda com o privilégio de quem disparou o trigger — ou seja, o usuário
`authenticated` dono da transação. **Revogar `EXECUTE` de `authenticated`
nessa function especificamente quebraria toda inserção/edição/exclusão de
transação** (`trg_transactions_balance` passaria a falhar com `permission
denied for function _transaction_balance_effect`). Confirmado via
`pg_proc`/dependência interna: nenhuma outra function ou RPC do schema
`public` chama qualquer uma das 11, e nenhum código do frontend (`src/`)
chama qualquer uma delas via `supabase.rpc(...)` — são exclusivamente
internas ao mecanismo de trigger.

### 31.4 Migration aplicada

`0034_revoke_public_execute_legacy_trigger_functions` — somente
`REVOKE`/`GRANT` de `EXECUTE`, nenhuma alteração de lógica de function,
trigger, RLS ou tabela:

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
-- (chamada interna via SECURITY INVOKER — ver 31.3)
revoke execute on function public._transaction_balance_effect(public.transactions) from public, anon;
grant  execute on function public._transaction_balance_effect(public.transactions) to authenticated;
```

### 31.5 Permissões finais (confirmadas via `pg_proc`/`has_function_privilege`)

| Function | PUBLIC | anon | authenticated | service_role | postgres |
|---|---|---|---|---|---|
| 10 functions `RETURNS trigger` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `_transaction_balance_effect` | ❌ | ❌ | ✅ | ✅ | ✅ |

`SECURITY INVOKER` preservado em todas as 11, `search_path=public` (fixado
desde a migration `0011`) preservado, todos os triggers permaneceram
associados (`pg_trigger`), RLS e policies inalteradas.

### 31.6 Testes executados (banco de produção, usuário descartável)

Toda a validação funcional/financeira foi feita com um usuário de teste
descartável criado via `auth.users` (dispara `handle_new_user`, criando
profile + conta "Carteira" + 16 categorias, igual a um signup real), com as
operações executadas **como role `authenticated`** (via `set role
authenticated` + `set_config('request.jwt.claims', ...)`), não como
`postgres` — para provar de fato que o `EXECUTE` restante é suficiente. Ao
final, o usuário de teste e todos os dados associados foram removidos por
`DELETE` em cascata (`auth.users` → todas as tabelas de domínio), e
confirmado com contagem zero em todas as tabelas relevantes e uma busca
textual por `TESTE-0034` em todas as tabelas de teste. Os dados reais de
produção não foram tocados.

**Regressão financeira (cenários pedidos):**

| Cenário | Esperado | Obtido | Resultado |
|---|---|---|---|
| 1. Saldo 1000 + receita recebida 500 | 1500,00 | 1500,00 | ✅ |
| 2. Saldo 1000 + despesa paga 200 | 800,00 | 800,00 | ✅ |
| 3. Cenário 2 + alterar valor para 300 | 700,00 | 700,00 | ✅ |
| 4. Cenário 2 + soft delete | 1000,00 | 1000,00 | ✅ |
| 4b. Restauração do soft delete acima | 800,00 | 800,00 | ✅ (extra, não pedido mas cobre item "restauração") |
| 5. Cenário 1 + alterar valor para 700 | 1700,00 | 1700,00 | ✅ |
| 6. Transferência 300 entre 2 contas | origem −300 / destino +300 | 1000→700 / 500→800 | ✅ |

**Funcional adicional:** alteração de status pendente→pago (1000→600) e
estorno pago→pendente (600→1000) ✅; parcelamento via RPC
`create_installment_transactions` (100/3 = 33,33+33,33+33,34) ✅.

**Smoke test das outras 5 functions do módulo (schemas prontos, sem UI
ainda):** `recalc_invoice_total` (fatura 0→150 ao lançar compra no cartão)
✅; `apply_investment_movement` (aporte 100 → aplicado/atual 100) ✅;
`check_budget_alerts` (100% do orçamento → notificação + flag) ✅;
`recalc_goal_amount` + `check_goal_completion` (contribuição 100 → meta
concluída) ✅; `recalc_financing_balance` e `recalc_loan_balance` (parcela
paga → status "quitado", saldo 0) ✅.

**Resultado: 0 falhas.** Nenhuma regressão encontrada — a regra crítica de
parar e investigar em caso de falha não precisou ser acionada.

### 31.7 Validação de código e segurança pós-migration

- Security Advisor (`get_advisors`, tipo security): idêntico ao pré-migration
  — só `auth_leaked_password_protection` (não relacionado). Confirma que o
  advisor não sinaliza esse tipo de grant, antes ou depois da correção.
- TypeScript (`tsc -b`): 0 erros.
- ESLint: 0 erros, 4 warnings (mesmos pré-existentes de sempre, arquivos
  `shadcn/ui`, não relacionados).
- Build de produção: sucesso.
- Nenhum arquivo local do repositório foi alterado por essa correção (é
  100% do lado do banco; não existe pasta `supabase/migrations` local — as
  migrations são aplicadas via MCP diretamente no projeto remoto).

Nenhum commit ou push foi feito.

---

## 32. Finalização da Fase 3 (2026-08-08)

Sessão dedicada a resolver as 7 pendências da seção 28. Ordem seguida:
Recorrências → Anexos → Tags → Centros de Custo → Dashboard → Testes →
Documentação → Validação final, sem pular etapas, com type-check e teste
após cada uma. Nenhum commit ou push foi feito.

### 32.1 Recorrências (`/recorrencias`)

Página completa substituindo o placeholder `ComingSoon`. Reaproveita 100%
do backend já existente (tabela `recurring_rules`, RPCs
`generate_due_recurrences`/`_next_recurrence_date`) — nenhuma lógica de
recorrência duplicada.

- **Repository estendido** (`recurring-rules.repository.ts`): `create`,
  `update` (edita o template, não mexe em `next_run_date`), `listTrashed`,
  `restore`, `getStats` (quantidade gerada + data da última ocorrência, uma
  query agregada por `recurring_id` para todas as regras da lista, evitando
  N+1).
- **Novo `recurring-rule.schema.ts`** (Zod) e `use-recurring-rules.ts`
  (TanStack Query: list/trashed/stats/create/update/setActive/end/
  softDelete/restore/generateDue).
- **UI:** `RecurringRuleFormDialog` (tipo, valor, categoria, conta,
  frequência, antecedência de geração, centro de custo, forma de pagamento,
  observações — `start_date` travado na edição), `RecurringRuleRow`
  (status Ativa/Pausada/Encerrada, próxima ocorrência, última ocorrência,
  quantidade gerada), aba Todas/Lixeira, botão "Gerar agora" chamando a RPC
  diretamente.
- **Bug de UX corrigido durante o teste:** o KPI "Na lixeira" só buscava a
  contagem quando a aba Lixeira estava aberta (`enabled: trashed`),
  mostrando sempre "0" fora dela. Corrigido para buscar sempre
  (`useTrashedRecurringRulesQuery(true)`), como já era feito em Contas.
- **Testado no navegador:** criar, editar (valor corrigido de R$150.000 —
  erro de digitação do próprio teste, não bug — para R$1.500 com sucesso),
  pausar, reativar, encerrar, "gerar agora" (1 ocorrência criada,
  `next_run_date` avançou 1 mês corretamente), **idempotência** (clicar
  "gerar agora" de novo no mesmo dia não duplica), excluir (lixeira),
  restaurar (histórico preservado).

### 32.2 Anexos no formulário de transação

`AttachmentsPanel` (já usado em Contas) integrado ao
`transaction-form-dialog.tsx`, visível apenas ao editar (precisa de um
`id` de transação já existente — mesmo padrão de "Reconciliar"/"Histórico"
em Contas, que também só aparecem com a entidade já salva). `"transaction"`
já estava no union type `AttachmentEntityType`; nenhuma mudança de backend
necessária.

**Bug real encontrado e corrigido:** os dois `<button>` internos de
`AttachmentsPanel` (abrir anexo e remover anexo) não tinham
`type="button"`. Enquanto o painel só era usado dentro de um `Sheet` (sem
`<form>` ao redor, em Contas), isso não tinha efeito. Ao passar a ser
renderizado dentro do `<form>` do `TransactionFormDialog`, o botão "Remover
anexo" — sem tipo explícito — herdava `type="submit"` do HTML padrão e
**submetia o formulário inteiro da transação** em vez de abrir a
confirmação de exclusão, fechando o diálogo de edição sem aviso. Corrigido
adicionando `type="button"` aos dois botões em
`src/components/shared/attachments-panel.tsx`. Reproduzido de forma
determinística antes da correção e confirmado resolvido depois (upload,
confirmação de exclusão e exclusão efetiva testados com sucesso).

Segurança do bucket `attachments` (privado, policies por
`{user_id}/...`) reconfirmada — ver seção 32.6.

### 32.3 CRUD de Tags (`/tags`, nova rota)

Nova página, nova entrada de menu ("Tags", grupo Movimentação), entre
Transações e Cartões. `tags_user_id_name_key` (constraint `UNIQUE(user_id,
name)`) já existia no banco desde a Fase 1 — só faltava expor. Adicionada
mensagem amigável em `lib/errors.ts` para essa constraint.

- `tags.repository.ts` estendido com `countUsage`/`countUsageBatch` (1
  query agregada para todos os contadores da lista).
- Novo `tags.service.ts`, `tag.schema.ts`, `use-tags.ts`.
- UI: `TagFormDialog` (nome + cor, com pré-visualização), `TagRow`
  (contador de lançamentos), página com busca e confirmação de exclusão
  (avisa quantos lançamentos usam a tag antes de excluir).
- Testado: criar, editar, excluir, **duplicidade bloqueada** (409 do
  banco, mensagem amigável exibida), associar/remover em transação
  (via `TagMultiSelect`, já existente), filtrar transações por tag (já
  implementado no repository da Fase 3, só faltava ter tags para testar).

### 32.4 CRUD de Centros de Custo (`/centro-de-custos`)

**Mudança de schema necessária:** a tabela `cost_centers` nunca teve coluna
para ativar/desativar. Migration `0035_cost_centers_active_flag` — aditiva,
`active boolean not null default true` — para suportar esse requisito sem
tocar em soft delete (a tabela não tem `deleted_at`; exclusão continua
sendo `DELETE` físico, seguro porque
`transactions.cost_center_id`/`recurring_rules.cost_center_id` têm
`ON DELETE SET NULL`, confirmado via `pg_constraint` antes de decidir — um
centro de custo excluído nunca deixa uma transação com referência quebrada,
só remove a marcação).

- `cost-centers.repository.ts` estendido com `update`, `setActive`,
  `countUsage`/`countUsageBatch`.
- Novo `cost-centers.service.ts`, `cost-center.schema.ts`,
  `use-cost-centers.ts`. `COST_CENTER_ICON_OPTIONS` adicionado ao registro
  de ícones.
- `useTransactionLookups` passou a filtrar só centros de custo `active`
  para novos lançamentos (centros inativos continuam resolvendo o nome em
  lançamentos antigos, só somem do seletor de novos).
- UI: `CostCenterFormDialog` (ícone, cor, nome), `CostCenterRow` (badge
  Ativo/Inativo), página com abas Todos/Ativos/Inativos.
- Testado: criar, ativar/desativar (e filtro por aba), associar em
  transação, filtrar transações por centro de custo.
- **Regenerado `src/types/database.types.ts`** após a migration `0035`
  (único arquivo de schema gerado que muda nesta sessão).

### 32.5 Dashboard com dados reais

Reescrito para usar as views da Fase 3 em vez das queries da Fase 1.

- `dashboard.repository.ts`: `getRecentTransactions`/`getUpcomingBills`
  passaram de `transactions` para `v_transactions_enriched` (mais rico,
  já traz `is_overdue`/`effective_status`); novo `getPendingSummary` lê
  `v_pending_by_due_date` (pré-agregada por tipo/vencido) para 4 números
  num único round-trip: contas a pagar/receber (total pendente, vencido +
  no prazo) e despesas atrasadas/receitas pendentes (subconjuntos);
  `getCategorySummary` ganhou parâmetro de tipo (despesa/receita).
- `use-dashboard.ts`: aceita um `DashboardPeriod { year, month }`
  navegável (default: mês atual); os totais do período (receita/despesa/
  resultado) são recalculados via soma das categorias do período
  selecionado, não mais fixos no mês atual.
- UI: navegador de período (◀ mês ▶, "Próximo" desabilitado no mês atual),
  4 KPIs novos (Contas a pagar, Contas a receber, Despesas atrasadas,
  Receitas pendentes) além dos 4 já existentes, tabs Despesas/Receitas no
  gráfico de pizza (antes só despesas), card "Despesas e receitas
  atrasadas" (antes só um contador, sem lista).
- **Bug de exibição corrigido:** classe CSS `capitalize` aplicada ao texto
  inteiro `"{mês} de {ano}"` capitalizava também a preposição, mostrando
  "Ago **De** 2026". Corrigido removendo a classe (o nome do mês já vem
  capitalizado de `MONTH_LABELS`).
- Testado: números batendo com dados reais, navegação para mês anterior
  (números do período mudam, saldo/pendências globais não mudam
  — comportamento correto), gráficos renderizando, dark mode.

### 32.6 Testes completos de UI e segurança

**Financeiro/funcional (transações):** criar receita e despesa, editar,
**duplicar** (nasce pendente mesmo se o original estava pago, tags
copiadas), pagar/receber, **cancelar**, **excluir + restaurar** (lixeira),
busca textual, filtro por centro de custo (badge de contagem de filtros
ativos), dark mode, responsividade mobile (sem overflow horizontal em
Tags/Centro de Custos/Recorrências/Dashboard). Todos os fluxos de saldo já
cobertos na Fase 3 original não foram retestados (nenhuma lógica de saldo
foi tocada nesta sessão).

**Segurança multiusuário — nível banco (mais rigoroso que clicar na UI):**
dois usuários descartáveis criados via `auth.users`, operações executadas
como role `authenticated` (não `postgres`) via `set_config('request.jwt.claims',
...)`, cobrindo tags, centros de custo, transações, recorrências e
anexos:

- Usuário B: `SELECT` sem filtro em todas as 5 tabelas = 0 linhas de A.
- Usuário B: `UPDATE`/`DELETE` por ID direto nos registros de A
  (renomear tag, apagar transações, desativar centro de custo, apagar
  recorrências e anexos) = **0 linhas afetadas em todos os casos**,
  confirmado consultando os dados de A depois — permanecem 100% intactos.
- Usuário B: criar e ver os próprios dados = funciona normalmente (RLS
  não está bloqueando geral, só isolamento entre usuários).
- Ambos os usuários e todos os dados de teste removidos ao final,
  confirmado com contagem zero.

**Console do navegador:** alguns `403` esporádicos observados durante
trocas de sessão (login/registro) e um teste deliberado de duplicidade
(`409`, esperado); um reload limpo com sessão já estável não produz
nenhum erro novo. Nenhuma operação testada nesta sessão falhou ou mostrou
toast de erro inesperado.

### 32.7 Bugs encontrados e corrigidos nesta sessão

| # | Onde | Bug | Correção |
|---|---|---|---|
| 1 | Recorrências | KPI "Na lixeira" sempre mostrava 0 fora da aba Lixeira (query condicional à aba ativa) | Query sempre habilitada, como em Contas |
| 2 | Anexos em Transações | Botões de `AttachmentsPanel` sem `type="button"` submetiam o `<form>` da transação ao serem clicados dentro de um Dialog (fechava o diálogo em vez de abrir a confirmação de exclusão) | `type="button"` explícito nos dois botões |
| 3 | Dashboard | `capitalize` no texto `"{mês} de {ano}"` produzia "Ago **De** 2026" | Removida a classe CSS |

### 32.8 Validação técnica final

- **TypeScript** (`tsc -b`): 0 erros.
- **ESLint**: 0 erros, 4 warnings (mesmos pré-existentes de sempre,
  `react-refresh/only-export-components` em arquivos `shadcn/ui`, não
  relacionados).
- **Build de produção:** sucesso.
- **Security Advisor** (`get_advisors`, tipo security): idêntico ao de
  antes desta sessão — só `auth_leaked_password_protection` (não
  relacionado, pré-existente).
- **Migrations:** só a `0035` (aditiva, `cost_centers.active`). Nenhuma
  migration antiga foi editada.
- **RLS:** inalterada em todas as tabelas — nenhuma policy nova ou
  modificada; a tabela `cost_centers` já tinha as 4 policies padrão desde
  a Fase 1, cobrindo também a coluna nova automaticamente.
- **Storage:** bucket `attachments` inalterado (mesmas policies
  `{user_id}/...` já auditadas na Fase 3).
- **git diff:** nenhum commit feito; arquivos alterados listados na seção
  27 (atualizada).

### 32.9 Pendência remanescente (não bloqueante)

Documentação complementar (`docs/ARQUITETURA.md`, `docs/BANCO_DE_DADOS.md`,
`docs/REGRAS_DE_NEGOCIO.md`) ainda não foi criada — é a única pendência da
seção 28 que não é estritamente sobre funcionalidade da Fase 3, por isso
não bloqueia declarar a fase concluída.

**Atualização (sessão seguinte):** os três documentos foram criados,
commitados (`e629d8e`) e enviados para `origin/develop`. Pendência
resolvida.

---

## 33. Fase 4 — Cartões e Faturas (2026-08-09)

Primeiro módulo da Fase 4. Detalhamento completo (decisões de design,
migration aplicada, testes financeiros e de segurança linha a linha) em
[`docs/MODULO_4.md`](./MODULO_4.md). Resumo:

- **Backend reaproveitado 100%:** `credit_cards`, `card_invoices`,
  `v_card_usage`, trigger `recalc_invoice_total` já existiam desde a Fase
  1. Nenhuma tabela ou coluna nova.
- **Migration `0036_validate_transaction_invoice_ownership`:** único
  ajuste de banco desta sessão — fecha uma lacuna real de segurança
  (ownership de `invoice_id` não validada em `validate_transaction_references`,
  mesma classe de achado da migration `0025`), aprovada pelo usuário antes
  de aplicar. Testada e confirmada bloqueando o ataque.
- **Lógica de saldo intocada:** compra no cartão nunca tem `account_id`
  (sem efeito de saldo); pagar a fatura gera uma despesa comum
  (`account_id` setado, `status: pago`, `invoice_id: null` de propósito)
  que passa pelo trigger de saldo já existente, sem nenhum mecanismo novo.
  `apply_transaction_balance`, `_transaction_balance_effect` e
  `apply_transfer_balance` não foram tocadas.
- **Formulário de Transações (Fase 3) preservado:** compra no cartão usa
  formulário próprio e isolado (`CardPurchaseDialog`), não altera
  `transaction.schema.ts`/`TransactionFormDialog`.
- **Testado como role `authenticated`, usuários descartáveis:** cenários
  financeiros (compra sem efeito de saldo, total da fatura correto,
  pagamento debitando a conta certa, sem duplicar o total), RLS/ownership
  multiusuário (incluindo o ataque específico de `invoice_id`), UI real no
  navegador (criar cartão → lançar compra → pagar fatura → saldo
  refletido em Contas), dark mode, mobile. Todos os dados de teste
  removidos, contagem zero confirmada.
- **TypeScript/ESLint/build:** 0 erros (um erro real de lint,
  `react-hooks/set-state-in-effect`, foi encontrado e corrigido durante a
  implementação).
- **Pendências não bloqueantes:** seletor de cartão na tela de Transações,
  RPC atômica para pagamento de fatura, parcelamento no cartão, correção
  de `recalc_invoice_total` para ignorar `deleted_at`/`cancelado` — todas
  detalhadas em `docs/MODULO_4.md` seção 9.

**Segundo módulo da Fase 4 (mesma sessão): Metas.** Backend (`goals`,
`goal_contributions`) também já existia desde a Fase 1. Detalhamento
completo em `docs/MODULO_4.md`, Parte 2 (seções 10-15). Resumo:

- **Nenhuma migration** — módulo inteiramente aditivo. Uma lacuna de
  ownership foi encontrada (`goal_contributions.goal_id` sem trigger de
  validação, análoga à de `invoice_id`), mas testada e confirmada **sem
  impacto real** (RLS de `goals` contém o dano na própria trigger
  `recalc_goal_amount`, `SECURITY INVOKER`) — decisão de não criar
  migration está documentada e justificada, não é uma omissão.
- **Retirada de meta** é modelada como `goal_contributions.amount`
  negativo (schema não tem coluna de tipo, diferente de
  `investment_movements`).
- **`check_goal_completion` só avança, nunca reverte** — confirmado
  empiricamente: retirar valor de uma meta já concluída não volta o
  status para `em_andamento`. Comportamento pré-existente, preservado.
- **Bug real encontrado e corrigido:** sheet de detalhe da meta mostrava
  progresso desatualizado após um aporte (guardava snapshot do objeto em
  vez de derivar da lista já invalidada) — corrigido antes de declarar a
  tarefa concluída.
- Testado como role `authenticated`, usuários descartáveis: 5 cenários
  financeiros (aporte, conclusão automática, retirada, exclusão com
  recálculo) + RLS multiusuário incluindo o ataque de `goal_id` de outro
  usuário — todos os dados de teste removidos, contagem zero confirmada.
- TypeScript/ESLint/build: 0 erros.

**Terceiro módulo da Fase 4 (mesma sessão): Investimentos.** Backend
(`investments`, `investment_movements`) também já existia desde a Fase 1.
Detalhamento completo em `docs/MODULO_4.md`, Parte 3 (seções 16-21).
Resumo:

- **Nenhuma migration.** Mesma classe de achado de ownership de Metas
  (`investment_movements.investment_id` sem trigger de validação) foi
  investigada e testada — confirmado que não corrompe dado de outro
  usuário (RLS de `investments` contém o dano na própria trigger).
- **`applied_amount` (principal) só aumenta com aportes** — resgates e
  rendimentos não o alteram, só afetam `current_amount` (valor atual).
  Confirmado lendo o código-fonte de `apply_investment_movement` antes de
  implementar, não presumido.
- **Edição de movimentação implementada** (diferente de Metas) — a
  trigger suporta `UPDATE` com reprocessamento completo de delta,
  confirmado em teste real (editar resgate de 200→300 recalculou
  corretamente).
- **Sem soft delete** — `investments` não tem `deleted_at` nem coluna de
  status no schema; exclusão é sempre física, sem opção de restaurar.
  Limitação do schema, documentada como tal, não inventada solução
  alternativa.
- **Sem colunas `color`/`icon`** em `investments` (diferente de
  Contas/Cartões/Metas) — aparência derivada de `type` via mapa fixo, não
  personalizável.
- Testado como role `authenticated`: 7 cenários financeiros (aporte,
  rendimento, resgate, edição, exclusão, todos com valores exatos
  conferidos) + RLS multiusuário incluindo o ataque de `investment_id` de
  outro usuário. Três erros `406` e dois `403` observados no console
  foram investigados (reproduzidos manualmente, confirmados como
  pré-existentes de troca de sessão, não regressão). Dados de teste
  removidos, contagem zero confirmada.
- TypeScript/ESLint/build: 0 erros.

**Quarto módulo da Fase 4 (mesma sessão): Empréstimos e Financiamentos.**
Backend (`loans`, `financings` + tabelas de parcelas) também já existia
desde a Fase 1. Detalhamento completo em `docs/MODULO_4.md`, Parte 4
(seções 22-29). Resumo:

- **Empréstimos e Financiamentos são conceitos diferentes no schema**
  (confirmado, não presumido) — financiamentos têm amortização SAC/Price
  com juros/amortização detalhados por parcela; empréstimos são parcelas
  fixas simples, sem sistema de amortização. Implementados como abas
  distintas, não um formulário único.
- **Fórmulas SAC/Price validadas matematicamente em Node** (5 cenários)
  antes de usar no banco, depois revalidadas com dados reais — soma das
  amortizações sempre fecha com o principal, saldo final sempre exatamente
  zero.
- **Decisão de sincronização:** diferente de transações, o schema de
  parcelas permite gravar `status = 'atrasado'` diretamente (sem trigger
  bloqueando) e os triggers de saldo leem esse valor — como não existe job
  automático, `list()` sincroniza parcelas vencidas antes de listar
  (mesmo espírito de `generate_due_recurrences`).
- **Bug real encontrado testando no navegador e corrigido:** o card de
  listagem mostrava "% pago" negativo para financiamentos (comparava
  `remaining_balance`, que inclui juros futuros, contra `principal_amount`,
  que não inclui) — corrigido removendo a métrica do card e adicionando
  um indicador correto por contagem de parcelas pagas dentro do detalhe.
- **Nenhuma migration** — mesma classe de achado de ownership de
  Metas/Investimentos (`*_installments.loan_id`/`financing_id` sem
  trigger de validação) testada e confirmada sem impacto real.
- TypeScript/ESLint/build: 0 erros. Dados de teste removidos, contagem
  zero confirmada.

## 34. Fase 4 — Orçamentos (2026-08-09, sessão seguinte ao handoff)

**Quinto e último módulo da Fase 4: Orçamentos.** Backend (`budgets`,
trigger `check_budget_alerts`) já existia desde a Fase 1. Detalhamento
completo em `docs/MODULO_4.md`, Parte 5 (seções 30-36). Resumo:

- **"Realizado" nunca é armazenado** — sempre derivado de
  `v_category_summary`, a mesma view/fonte já usada no Dashboard, em vez
  de o frontend duplicar a soma de `transactions`. Confirmado
  (lendo `validate_transaction_references`) que o filtro da view é
  equivalente ao usado pela trigger (`type='despesa' AND status='pago'`).
- **`check_budget_alerts` smoke-testada com valores reais**: salto de
  0%→50%→110% num mesmo orçamento confirmou a cascata de flags (100%
  marca as 4 de uma vez), a monotonicidade (editar `planned_amount` ou
  excluir a transação que gerou o alerta não reseta as flags) e que o
  "realizado" exibido na UI sempre reflete o estado atual das
  transações (nunca fica desatualizado), mesmo quando as flags ficam
  "presas" no valor mais alto já atingido.
- **`useInvalidateTransactions` passou a invalidar `["budgets"]`**
  (requisito explícito do usuário) — testado ao vivo dentro da SPA
  (sem reload de página): criar uma despesa em Transações e navegar
  para Planejamento por link do menu atualizou o card imediatamente.
- **Nenhuma migration** — mesma classe de achado de ownership de
  Metas/Investimentos/Empréstimos: `budgets.category_id` sem trigger de
  validação, testado com dois usuários descartáveis e confirmado sem
  impacto real (a linha "fantasma" pertence ao próprio atacante e nunca
  é acionada por uma transação de outro usuário).
- TypeScript/ESLint/build: 0 erros. Testado no navegador (criar, editar,
  excluir, mobile 375px sem overflow, dark mode com cores corretas via
  tokens já existentes). Dados de teste (SQL e navegador) removidos,
  contagem zero confirmada.
- **Pendência não bloqueante identificada (pré-existente, fora do
  escopo deste módulo):** o sino de notificações (`useNotifications`)
  não invalida em tempo real após mutações de transação — só atualiza
  por polling de 60s do contador ou remount. A notificação de orçamento
  é gravada corretamente no banco; só demora a aparecer no sino. Afeta
  igualmente notificações de outros módulos (cartão, meta), não é
  regressão desta sessão.
