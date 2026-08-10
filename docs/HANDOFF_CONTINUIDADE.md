# HANDOFF DE CONTINUIDADE — Meu Financeiro

> **Ponto de entrada principal da próxima sessão.** Escrito para permitir
> que outro Claude Code continue o projeto **sem depender do histórico
> desta conversa**. Todos os dados abaixo foram confirmados via `git`,
> `package.json`, consultas diretas ao banco de produção (`execute_sql`,
> `pg_get_functiondef`, `information_schema`) e leitura do código real no
> momento da escrita — nada foi inventado.
>
> **Atualizado em:** 2026-08-10 — **Fase 4 concluída (100%) e sistema
> auditado para pré-produção.** A sequência de sessões anteriores
> implementou os 8 módulos da Fase 4 e uma auditoria geral pós-módulos
> (ver seções 33-36 de `docs/CONTEXTO_PROJETO.md` e `docs/MODULO_4.md`
> Partes 5-8). Esta sessão foi uma **auditoria final de pré-produção**
> dedicada — segurança, integridade financeira, banco, performance,
> frontend, qualidade e preparação para deploy no Vercel, sem nenhuma
> funcionalidade nova. Encontrou e corrigiu **5 problemas reais**, o
> mais crítico sendo um bug de build que quebraria 100% do deploy no
> Vercel (tela em branco). Documento completo:
> **[`docs/PRE_PRODUCAO.md`](./PRE_PRODUCAO.md)** — leia-o antes de
> qualquer trabalho relacionado a deploy/segurança/performance. **Não
> existe mais nenhuma página `ComingSoon`.**

---

## 1. Identidade do projeto

- **Nome:** Meu Financeiro
- **Objetivo:** aplicativo de gestão financeira pessoal completa — contas,
  categorias, transações (receitas/despesas), recorrências, tags, centros
  de custo, anexos, cartões/faturas, metas, investimentos, empréstimos,
  financiamentos, orçamento, relatórios, configurações e calendário
  financeiro. **Todos os módulos da Fase 4 estão implementados — nenhuma
  página `ComingSoon` restante.**
- **Frontend:** React 19 + TypeScript (modo `strict`), Vite 8.
- **Backend:** Supabase — Postgres 17.6, Auth, Storage. Nenhum backend
  próprio (Node/API): o frontend fala diretamente com o Supabase via
  `supabase-js`, sempre atrás da camada `repository`.
- **Banco:** Postgres 17.6 gerenciado pelo Supabase, RLS habilitado em
  100% das tabelas de domínio. Project ref `xocehjrujmaxhwqhxelo`, região
  `sa-east-1`.
- **Autenticação:** Supabase Auth (e-mail/senha) — login, cadastro,
  recuperação/redefinição de senha. Nenhuma manipulação direta de senha
  pelo frontend/banco — sempre via `supabase.auth.*`.
- **UI:** TailwindCSS v4 + shadcn/ui (estilo "new-york", Radix
  primitives), dark/light/automático.
- **Estado:** TanStack Query v5 (estado de servidor) + React Hook Form
  (formulários). Nenhum Redux/Zustand.
- **Validação:** Zod, um schema por formulário em `src/schemas/`.
- **Build:** Vite (`npm run build` = `tsc -b && vite build`). Sem script
  `typecheck` dedicado — usar `npx tsc -b --noEmit` para checar tipos
  isoladamente.
- **Deploy:** ainda não realizado (nem frontend nem CI/CD). Único
  componente em produção real é o banco Supabase remoto.
- **Arquitetura obrigatória:** `repository → service → hook →
  component/page`. Nenhuma tela chama `supabase` diretamente. Documentado
  em detalhe em [`docs/ARQUITETURA.md`](./ARQUITETURA.md).

---

## 2. Estado atual do Git

Confirmado nesta sessão (antes do commit final de documentação):

```
branch atual:      develop
working tree:      docs/*.md modificados, ainda não commitados (ver seção abaixo)
HEAD local:         863bb7e
origin/develop:     1ae86ed (será sincronizado após o commit final de documentação)
origin/main:        eb92bfa  (intacta, nenhum push desde o commit inicial)
```

Histórico (mais recente primeiro):

```
863bb7e  fix(estabilidade): adiciona ErrorBoundary global
3abefc8  fix(deploy): corrige base path do Vite e adiciona vercel.json para SPA
1ae86ed  docs: atualiza documentacao apos finalizacao completa da fase 4
77cba4b  fix(auditoria): corrige bugs reais encontrados na auditoria geral
d5d640d  feat(calendario): implementa calendario financeiro consolidado
ba6108d  feat(configuracoes): implementa perfil, tema, metas financeiras e senha
a89ca50  feat(relatorios): implementa modulo de relatorios financeiros
```

Um commit final de documentação (`docs: ...`) fecha esta sessão de
pré-produção — confira `git log --oneline -6` para confirmar que ele já
está em `origin/develop` no momento em que você lê isto.

**Migration aplicada nesta sessão (pré-produção):**
`0037_rls_auth_uid_performance_optimization` — reescreve, via `ALTER
POLICY`, `qual`/`with_check` de todas as policies RLS (schemas `public`
e `storage`) que ainda usavam `auth.uid()` sem subquery, trocando por
`(select auth.uid())` (mesma semântica, avaliação uma vez por query em
vez de uma vez por linha). Aditiva, não recria nenhuma policy, retestada
com `get_advisors` e com 2 usuários descartáveis (zero regressão de
isolamento). Detalhe completo em `docs/PRE_PRODUCAO.md` seção 2 e
`docs/BANCO_DE_DADOS.md` seção 34.

**Migration aplicada — Relatórios (`a89ca50`):**
`fix_v_net_worth_auth_users_permission` — corrige um bug real
pré-existente (não uma vulnerabilidade): `v_net_worth` dependia de
`auth.users`, tabela sem `GRANT SELECT` para `authenticated`, e por
isso **nunca funcionou** para nenhum usuário real desde a Fase 1 — o
card "Patrimônio líquido" do Dashboard sempre mostrou `R$ 0,00`
silenciosamente. Corrigida trocando `FROM auth.users` por `FROM
(select auth.uid() as id) u` — aditiva, sem tocar nenhuma trigger
financeira. Detalhe completo, com testes antes/depois, em
`docs/BANCO_DE_DADOS.md` seção 32 e `docs/MODULO_4.md` seção 38.

**Configurações (`ba6108d`) e Calendário (`d5d640d`): sem migration** —
nenhum dos dois módulos precisou de alteração de schema (`docs/MODULO_4.md`
Partes 7-8; `docs/BANCO_DE_DADOS.md` seção 33).

**Auditoria geral (`77cba4b`):** 2 bugs reais adicionais encontrados e
corrigidos, sem migration — `type="button"` faltando em
`user-menu.tsx` e falta de invalidação de `["calendar"]` em 7 hooks de
mutação. Ver seção 11.

---

## 3. Estado das fases

| Fase | Estado | Observação |
|---|---|---|
| Fase 1 (Contas) | ✅ CONCLUÍDA | Commit `eb92bfa` |
| Fase 2 (Categorias) | ✅ CONCLUÍDA | Commit `eb92bfa` |
| Fase 3 (Receitas/Despesas/Recorrências/Tags/Centros de Custo/Anexos/Dashboard) | ✅ CONCLUÍDA | Commit `58936f2` |
| Fase 4 — Cartões/Faturas | ✅ CONCLUÍDA | Commit `485ad1a`, migration `0036` |
| Fase 4 — Metas | ✅ CONCLUÍDA | Commit `a1cdc99`, sem migration |
| Fase 4 — Investimentos | ✅ CONCLUÍDA | Commit `820cc56`, sem migration |
| Fase 4 — Empréstimos/Financiamentos | ✅ CONCLUÍDA | Commit `8a0c9f4`, sem migration |
| Fase 4 — Planejamento/Orçamento | ✅ CONCLUÍDA | Commit `cad741d`, sem migration — `MODULO_4.md` Parte 5 |
| Fase 4 — Relatórios | ✅ CONCLUÍDA | Commit `a89ca50`, 1 migration (bug real em `v_net_worth`, não vulnerabilidade) — `MODULO_4.md` Parte 6 |
| Fase 4 — Configurações | ✅ CONCLUÍDA | Commit `ba6108d`, sem migration — `MODULO_4.md` Parte 7 |
| Fase 4 — Calendário | ✅ CONCLUÍDA | Commit `d5d640d`, sem migration — `MODULO_4.md` Parte 8 |
| Auditoria geral do sistema + auditoria financeira cruzada | ✅ CONCLUÍDA | Commit `77cba4b` (2 bugs reais corrigidos) — `MODULO_4.md` seções 53-56 |

**A Fase 4 está 100% concluída — 8 de 8 módulos implementados.** As 4
páginas que eram `ComingSoon` no início desta sequência de sessões
(`src/pages/planning/planning.tsx`, `src/pages/calendar/calendar.tsx`,
`src/pages/reports/reports.tsx`, `src/pages/settings/settings.tsx`) são
hoje páginas completas, testadas e documentadas. **Não existe mais
nenhuma página `ComingSoon` no projeto.**

---

## 4. Documentação existente — o que já existe e onde está cada coisa

| Arquivo | Conteúdo |
|---|---|
| `docs/HANDOFF_CONTINUIDADE.md` | Este arquivo — ponto de entrada |
| `docs/CONTEXTO_PROJETO.md` | Histórico detalhado sessão a sessão desde a Fase 1, incluindo auditorias de segurança (seção 31: migration `0034`) e resumos de cada módulo da Fase 4 |
| `docs/MODULO_3.md` | Decisões técnicas da Fase 3 (transações, saldo, parcelamento, recorrências) |
| `docs/MODULO_4.md` | **O mais importante para os módulos da Fase 4** — 8 partes, uma por módulo (Cartões/Faturas, Metas, Investimentos, Empréstimos/Financiamentos, Orçamento, Relatórios, Configurações, Calendário), cada uma com decisões, fórmulas, testes, bugs e pendências, mais uma seção final de auditoria geral do sistema (bugs encontrados/corrigidos, achados documentados não corrigidos) |
| `docs/ARQUITETURA.md` | Padrões de código: camadas, TanStack Query, formulários, dialogs, erros, convenções |
| `docs/BANCO_DE_DADOS.md` | Schema completo: tabelas, enums, views, functions, RLS, segurança — **atualizado a cada módulo da Fase 4 e na auditoria de pré-produção** |
| `docs/REGRAS_DE_NEGOCIO.md` | Regras por domínio, marcadas `[UI]`/`[Backend]`/`[Requer confirmação]` |
| `docs/PRE_PRODUCAO.md` | **Novo.** Registro completo da auditoria final de pré-produção: bugs encontrados/corrigidos, testes de segurança, estado do banco, checklist de deploy no Vercel (variáveis, `vercel.json`, configuração necessária no Supabase Auth) |

**Leia nesta ordem na próxima sessão:** este arquivo → `docs/PRE_PRODUCAO.md`
(se a tarefa envolver deploy, segurança ou qualquer dúvida sobre "o
sistema está pronto?") → `MODULO_4.md` (se a próxima tarefa envolver um
módulo já implementado) → `BANCO_DE_DADOS.md`/`REGRAS_DE_NEGOCIO.md`
(seções relevantes) → `ARQUITETURA.md` só se precisar relembrar um
padrão específico. **Não é necessário reler tudo — os 8 módulos da Fase
4 e a auditoria de pré-produção já estão completamente documentados e
não precisam de nova investigação.** Não há um "próximo módulo"
definido — ver seção 14 para orientação sobre possíveis próximos
passos, e `docs/PRE_PRODUCAO.md` seção 6 para os passos manuais que
faltam antes do primeiro deploy real.

---

## 5. Cartões/Faturas — o que já foi construído (resumo; detalhe completo em `MODULO_4.md` Parte 1)

- **Rota:** `/cartoes`. **Arquivos principais:**
  `src/repositories/credit-cards.repository.ts`,
  `card-invoices.repository.ts`, `src/services/credit-cards.service.ts`,
  `card-invoices.service.ts`, `src/hooks/use-credit-cards.ts`,
  `use-card-invoices.ts`, `src/components/cards/*` (5 componentes),
  `src/lib/card-invoice.ts` (resolução de período de fatura).
- **Tabelas:** `credit_cards`, `card_invoices`. **Trigger:**
  `recalc_invoice_total` (soma `amount` das transações vinculadas por
  `invoice_id`).
- **Regra crítica preservada:** compra no cartão **nunca** afeta saldo de
  conta imediatamente (`transactions.account_id = null` na compra) —
  `_transaction_balance_effect` retorna 0 para conta nula. Pagamento da
  fatura gera uma **segunda** transação (despesa comum, `account_id`
  setado, `status: pago`, `invoice_id: null` de propósito para não
  duplicar o total) que passa pelo trigger de saldo normal, sem mecanismo
  novo.
- **Resolução automática de fatura:** `src/lib/card-invoice.ts`
  (`resolveInvoicePeriod`) — não existe RPC/trigger para isso; decisão de
  implementação, find-or-create sobre `UNIQUE(card_id, reference_month)`.
- **Migration `0036_validate_transaction_invoice_ownership`:** única
  migration de toda a Fase 4 até agora. Corrige lacuna real de ownership
  em `transactions.invoice_id` (não validada por
  `validate_transaction_references` antes). Aprovada pelo usuário antes
  de aplicar, testada e confirmada bloqueando o ataque.
- **Limitações conhecidas, documentadas, não corrigidas:**
  `payInvoice` não é atômico (duas operações sequenciais: criar
  transação de pagamento + marcar fatura como paga); `recalc_invoice_total`
  soma compras excluídas/canceladas no total da fatura (comportamento
  herdado da trigger, não alterado); parcelamento/recorrência de compra
  no cartão não implementado.

---

## 6. Metas e Investimentos — o que já foi construído (resumo; detalhe completo em `MODULO_4.md` Partes 2-3)

### Metas (`/metas`)

- `current_amount` **nunca** é escrito pelo frontend — 100% derivado por
  `recalc_goal_amount` a partir de `goal_contributions`.
- Retirada = `amount` **negativo** (schema não tem coluna de tipo,
  diferente de `investment_movements`).
- `check_goal_completion` só **avança** `em_andamento → concluida`,
  **nunca reverte** — confirmado empiricamente (retirar valor de meta
  concluída não volta o status).
- **Bug real corrigido nesta sessão:** sheet de detalhe guardava um
  snapshot (`useState<Goal>`) que ficava desatualizado após um aporte —
  corrigido derivando sempre da lista já buscada
  (`useState<string | null>` só para o id + `.find()`).
- **Sem migration** — lacuna de ownership em
  `goal_contributions.goal_id` (sem trigger de validação) foi testada
  empiricamente com dois usuários descartáveis e confirmada **sem
  impacto real**: `recalc_goal_amount` é `SECURITY INVOKER`, então a
  `UPDATE` que faz em `goals` roda com o privilégio do atacante e é
  bloqueada pela RLS de `goals`.

### Investimentos (`/investimentos`)

- **Isolado de contas/saldo/transações** — confirmado lendo
  `apply_investment_movement` antes de implementar; `investments.account_id`
  é só informativo.
- `applied_amount` (principal) **só aumenta com aportes** — resgate e
  rendimento não o alteram; `current_amount` (valor atual) sobe com
  aporte/rendimento, desce com resgate. Confirmado testando os 3 tipos
  de movimentação com valores reais no banco.
- **Edição de movimentação suportada** (diferente de Metas) — a trigger
  reprocessa o delta completo em `UPDATE`.
- **Sem `deleted_at` nem `color`/`icon`** no schema de `investments` —
  exclusão é sempre física (sem restaurar), aparência derivada de `type`
  via mapa fixo no frontend. Limitações do schema, documentadas, não
  contornadas com gambiarra.
- **Sem migration** — mesma classe de achado de ownership de Metas em
  `investment_movements.investment_id`, testada e confirmada sem impacto
  real pela mesma razão (RLS de `investments` contém o dano dentro da
  trigger `SECURITY INVOKER`).

---

## 7. Empréstimos/Financiamentos — o que já foi construído (detalhe completo em `MODULO_4.md` Parte 4)

- **Rota:** `/emprestimos`, com **duas abas** ("Empréstimos"/
  "Financiamentos") na mesma página — decisão baseada em investigação
  real do schema, não presumida: `loans`/`loan_installments` não têm
  colunas de amortização (parcelas fixas simples, valor informado pelo
  usuário); `financings`/`financing_installments` têm
  `amortization: sac | price` e detalhamento completo de
  juros/amortização por parcela.
- **Fórmulas SAC/Price** implementadas em `src/lib/financing-schedule.ts`
  (função pura) — **validadas matematicamente com Node** (5 cenários,
  incluindo 0% de juros e 24 parcelas) antes de gravar qualquer dado
  real: soma das amortizações sempre fecha com o principal exato, saldo
  da última parcela sempre exatamente 0.
- **`status = 'atrasado'` pode ser gravado diretamente** nas tabelas de
  parcela (diferente de `transactions`, sem trigger de bloqueio) — os
  triggers `recalc_loan_balance`/`recalc_financing_balance` leem esse
  valor. Como não existe job automático, `loansService.list`/
  `financingsService.list` sincronizam parcelas vencidas antes de listar
  (mesmo espírito de `generate_due_recurrences`, já estabelecido desde a
  Fase 3).
- **Pagamento parcial suportado e testado** — `paid_amount` é coluna
  separada de `amount`; a fórmula de `remaining_balance` já contabiliza
  isso mesmo com `status` ainda `pendente`.
- **Bug real encontrado testando no navegador e corrigido:** o card de
  listagem (`DebtCard`) mostrava "% pago" **negativo** para
  financiamentos, porque `remaining_balance` inclui juros futuros e pode
  começar maior que `principal_amount`. Corrigido removendo a métrica do
  card e adicionando um indicador correto (contagem de parcelas pagas)
  dentro dos sheets de detalhe.
- **Sem migration** — mesma classe de achado de ownership de
  Metas/Investimentos em `loan_installments.loan_id`/
  `financing_installments.financing_id`, testada e confirmada sem
  impacto real.
- **Decisão não verificável só pelo schema, documentada como tal:**
  `financings.interest_rate` (`numeric(7,4)`, sem unidade explícita)
  tratado como percentual por período (ex.: `1.5` = 1,5% a.m.).

---

## 7.1 Orçamento, Relatórios, Configurações e Calendário — o que já foi construído

Resumo dos 4 módulos finais da Fase 4 (detalhe completo em
`docs/MODULO_4.md` Partes 5-8). Todos seguem `repository → service →
hook → component/page`, nenhum criou tabela nova.

### Orçamento (`/planejamento`)

CRUD sobre a tabela `budgets` já existente desde a Fase 1; "realizado"
nunca armazenado, sempre recalculado ao vivo com o mesmo filtro que a
trigger `check_budget_alerts` usa (`despesa` + `pago` + mês/ano de
`date`), evitando divergência com os alertas reais do banco. Sem
migration — `budgets` é tabela folha, sem filhos.

### Relatórios (`/relatorios`)

4 seções (visão geral, por categoria, fluxo de caixa, patrimônio), todas
reaproveitando views já existentes (`v_monthly_summary`,
`v_category_summary`, `v_cash_flow_daily`, `v_net_worth`) — nenhum
cálculo financeiro novo no frontend. Corrigiu o bug real de
`v_net_worth` (seção 2).

### Configurações (`/configuracoes`)

- **Perfil:** `full_name`/`avatar_url` de `profiles`, via
  `settings.repository.ts` → `useUpdateProfile()` (chama
  `refreshProfile()` do `AuthContext`, não uma query TanStack — `profile`
  não vive no cache de query).
- **Aparência:** tema controlado **diretamente por `next-themes`**
  (`useTheme().setTheme()`), **não** por `profiles.theme` — decisão
  tomada após confirmar que os dois sistemas estavam de fato
  desconectados (nenhum componente lia/escrevia `profiles.theme`);
  documentada como `[Requer confirmação]` se algum dia for necessário
  sincronizar persistência de tema entre dispositivos.
- **Metas financeiras:** `monthly_goal`/`annual_goal` de `profiles`,
  agora com consumidor real (form + card de progresso reaproveitando
  `useMonthlySummariesQuery`).
- **Segurança:** troca de senha via `supabase.auth.updateUser()` (novo
  `updatePassword()` em `AuthContext`), reaproveitando o schema Zod já
  existente de `resetPasswordSchema`.
- **`currency`/`language` de `profiles`:** deliberadamente **não**
  expostos como editáveis (sem efeito real no app hoje) — mostrados como
  texto informativo estático.
- Sem migration.

### Calendário (`/calendario`)

Grade de mês customizada (date-fns, não o `react-day-picker` de
`src/components/ui/calendar.tsx`, inadequado para células com conteúdo
rico). Agrega 6 fontes de eventos financeiros num único hook
(`useCalendarEvents`, 6 `useQuery` em paralelo — sem view/tabela nova,
sem N+1): `transactions.due_date`, `card_invoices.due_date`,
`loan_installments.due_date`, `financing_installments.due_date`,
`goals.target_date`, `recurring_rules.next_run_date` (só a **próxima**
ocorrência armazenada, sem projetar futuras — evita divergir da lógica
real de `_next_recurrence_date`). Sem migration.

---

## 8. Estado real do banco — confirmado nesta sessão, não presumido

- **Migrations conhecidas:** 36 (`0001`–`0036`). `0034` e `0035` da Fase
  3 (hardening de `EXECUTE`, `cost_centers.active`); `0036` da Fase 4
  (ownership de `invoice_id`). **Nenhuma migration nova nesta sessão.**
- **Tabelas com dado real hoje:** confirmado via `count(*)` nesta sessão
  — `credit_cards`, `investments`, `goals`, `transactions` e todas as
  demais tabelas de domínio dos módulos já implementados estão **com 0
  linhas** (só dados de teste descartáveis foram usados, todos
  removidos). `categories` tem as 16 categorias padrão; `profiles`/
  `accounts` têm 1 linha cada (o usuário real do projeto).
- **Functions/triggers financeiras críticas (não tocadas em nenhum
  módulo da Fase 4):**
  - `_transaction_balance_effect` (`SECURITY INVOKER`, `RETURNS numeric`)
    — `EXECUTE` mantido para `authenticated` desde a migration `0034`;
    **nunca revogar sem reanálise completa** (quebra toda liquidação de
    transação).
  - `apply_transaction_balance` — trigger de saldo por delta em
    `transactions`. Intocada.
  - `apply_transfer_balance` — trigger de saldo de transferências.
    Intocada, sem UI ainda.
  - `validate_transaction_references` — valida ownership de
    `account_id`/`category_id`/`cost_center_id`/`card_id`/`invoice_id`
    (este último desde a migration `0036`) em `transactions`.
- **Padrão de segurança estabelecido e replicado em todos os módulos da
  Fase 4:** toda tabela "filha" nova (`goal_contributions`,
  `investment_movements`, `loan_installments`,
  `financing_installments`) foi **testada empiricamente** com dois
  usuários descartáveis antes de decidir se precisava de migration. Em
  todos os 4 casos, a trigger de recálculo da tabela "pai"
  (`recalc_goal_amount`, `apply_investment_movement`,
  `recalc_loan_balance`, `recalc_financing_balance`) é `SECURITY
  INVOKER`, e a RLS da tabela pai bloqueia a `UPDATE` cruzada feita pelo
  atacante — por isso nenhuma dessas 4 lacunas recebeu migration. A
  única migration da Fase 4 (`0036`) foi para `transactions.invoice_id`,
  onde o padrão já usado para as outras colunas de `transactions`
  (`validate_transaction_references`) tornava a inconsistência mais
  visível e o risco pareceu maior antes de testar — depois de testar as
  4 lacunas seguintes, ficou claro que o padrão real de contenção é via
  RLS na trigger `SECURITY INVOKER`, não necessariamente via trigger de
  validação explícita. **Isso é uma observação útil para a próxima
  sessão:** antes de propor uma migration para uma nova lacuna de
  ownership, teste empiricamente primeiro (usuários descartáveis) — pode
  não ser necessária.
- **RLS:** habilitado em 100% das tabelas de domínio, padrão `user_id =
  auth.uid()` (ou `(select auth.uid())` nas tabelas mais recentes),
  confirmado tabela por tabela em cada módulo implementado.

---

## 9. Regras financeiras críticas — área de alto risco, não alterar sem investigar

| Módulo | Regra | Function/trigger responsável |
|---|---|---|
| Transações | Saldo por delta (`efeito(NEW) − efeito(OLD)`) | `apply_transaction_balance` + `_transaction_balance_effect` |
| Transações | `atrasado` sempre derivado, nunca gravado | `validate_transaction_status` bloqueia a gravação |
| Cartões | Compra não afeta saldo; pagamento da fatura sim | Ausência de `account_id` na compra + `apply_transaction_balance` normal na liquidação |
| Cartões | Total da fatura = soma das compras vinculadas | `recalc_invoice_total` |
| Metas | `current_amount` = soma de `goal_contributions.amount` | `recalc_goal_amount` |
| Metas | Conclusão automática, nunca reverte | `check_goal_completion` |
| Investimentos | `applied_amount` só sobe com aporte | `apply_investment_movement` |
| Investimentos | `current_amount` sobe com aporte/rendimento, desce com resgate | `apply_investment_movement` |
| Empréstimos/Financiamentos | `remaining_balance = sum(amount − paid_amount)` das parcelas não pagas | `recalc_loan_balance`/`recalc_financing_balance` |
| Empréstimos/Financiamentos | Status `quitado`/`atrasado`/`ativo` derivado das parcelas | mesmas triggers acima |
| Orçamento | `spent` (realizado) nunca armazenado, sempre agregado de `transactions` | `check_budget_alerts` (mesmo filtro replicado no frontend) |

**Nenhuma dessas functions/triggers foi alterada em nenhum módulo da
Fase 4.** Toda integração nova (Cartões, Metas, Investimentos,
Empréstimos/Financiamentos, Orçamento, Relatórios) foi construída **em
cima** delas, nunca duplicando o cálculo no frontend. Configurações e
Calendário não tocam saldo/valores financeiros (o primeiro só edita
perfil/metas de exibição; o segundo só lê datas de vencimento).

---

## 10. Testes realizados ao longo da Fase 4 completa (todos os 8 módulos + auditoria)

### TypeScript / ESLint / Build

Executados e passando **depois de cada módulo**, incluindo depois de
cada correção de bug: `npx tsc -b --noEmit` (0 erros em todas as
rodadas), `npm run lint` (0 erros, sempre os mesmos 4 warnings
pré-existentes de `shadcn/ui`, categoria
`react-refresh/only-export-components` — não são regressão), `npm run
build` (sucesso em todas as rodadas; bundle final da auditoria geral
~1,63 MB / 445 KB gzip).

### Testes financeiros (banco de produção, usuários descartáveis, role `authenticated`)

- **Cartões:** compra sem efeito de saldo; total da fatura correto após
  múltiplas compras; pagamento debitando a conta certa; total não
  duplica após o pagamento; limite liberado após fatura paga.
- **Metas:** aporte, conclusão automática ao atingir o alvo, retirada
  sem reverter status, exclusão de movimentação com recálculo correto.
- **Investimentos:** aporte, rendimento, resgate, edição de movimentação
  com reprocessamento de delta, exclusão com recálculo, `v_net_worth`
  refletindo corretamente.
- **Empréstimos:** criação + parcelas, pagamento total, pagamento
  parcial, sincronização de atraso, quitação completa.
- **Financiamentos SAC:** criação + parcelas com juros/amortização
  corretos, pagamento, quitação — valores conferidos contra o cálculo
  manual em Node antes de gravar no banco.
- **Orçamento:** cascata de alertas 50→75→90→100%, monotonicidade
  (flags não resetam), "realizado" batendo com o filtro real da trigger.
- **Relatórios:** todos os 4 relatórios conferidos contra os mesmos
  números do Dashboard/módulos de origem (mesma fonte de verdade);
  `v_net_worth` retestada após o fix, agora não-zero para usuário real.
- **Configurações:** metas mensais/anuais persistidas e refletidas
  imediatamente no card de progresso (via `refreshProfile()`, sem
  reload).
- **Calendário:** cenário cruzado com Dashboard/Relatórios/Orçamento
  (R$1.000 receita / R$300 despesa paga / R$700 resultado / R$700
  patrimônio / R$100 pendente) confirmado idêntico nas 4 telas
  simultaneamente (auditoria financeira cruzada).

### Testes de segurança / RLS multiusuário

Para **cada** módulo com escrita financeira (Cartões, Metas,
Investimentos, Empréstimos, Financiamentos, Orçamento, Configurações):
dois usuários descartáveis criados via `auth.users`,
SELECT/UPDATE/DELETE cruzado testado (sempre 0 linhas afetadas/visíveis,
dado real do usuário A confirmado intacto depois), e tentativa de
`INSERT` na tabela filha referenciando `id` de A como B — em todos os
casos testados e documentados (ver seção 8).

### Testes de UI

Fluxo completo testado no navegador para cada módulo (registro de
usuário descartável → criar → editar → detalhe → ação principal →
verificação de valores refletidos). Mobile (375px, sem overflow
horizontal) e dark mode verificados em todos os módulos. Console checado
em cada módulo — os únicos erros observados (`403`/`406` esporádicos)
foram investigados e confirmados como padrão pré-existente de troca de
sessão (documentado desde a Fase 3), não regressão de nenhum módulo novo.

### Dados de teste

**Todos removidos ao final de cada módulo**, contagem zero confirmada
via SQL a cada vez. Confirmado novamente nesta sessão de handoff: todas
as tabelas de domínio dos módulos implementados estão com 0 linhas
(exceto os dados reais pré-existentes: 1 conta, 16 categorias padrão, 1
perfil).

---

## 11. Bugs encontrados e corrigidos — lições aprendidas

| # | Módulo | Bug | Correção |
|---|---|---|---|
| 1 | Fase 3 | `AttachmentsPanel` submetia o formulário de transação por falta de `type="button"` nos botões internos | `type="button"` explícito |
| 2 | Fase 3 | KPI "Na lixeira" de Recorrências sempre mostrava 0 fora da aba Lixeira | Query passou a rodar sempre |
| 3 | Fase 3 | Dashboard mostrava "Ago **De** 2026" (capitalize aplicado à preposição) | Classe CSS removida |
| 4 | Cartões | `useEffect`+`setState` desnecessário em `invoice-detail-sheet.tsx` (antipadrão `react-hooks/set-state-in-effect`) | Fatura selecionada derivada direto na renderização |
| 5 | Metas | Sheet de detalhe mostrava progresso desatualizado após aporte (guardava snapshot do objeto) | `openGoalId` (string) + `.find()` na lista já buscada, em vez de `useState<Goal>` |
| 6 | Empréstimos/Financiamentos | Card de listagem mostrava "% pago" negativo para financiamentos (`remaining_balance` inclui juros e pode ser > `principal_amount`) | Métrica removida do card; indicador correto por contagem de parcelas pagas adicionado ao detalhe |
| 7 | Relatórios | `v_net_worth` sempre retornava `permission denied for table users` para qualquer usuário real desde a Fase 1 (`authenticated` nunca teve `GRANT SELECT` em `auth.users`) — Patrimônio líquido sempre `R$ 0,00` silenciosamente | Migration `fix_v_net_worth_auth_users_permission`: `FROM auth.users u` → `FROM (select auth.uid() as id) u` |
| 8 | Calendário | Eventos com valor `0` (ex.: fatura recém-criada) exibiam `"+-R$ 0,00"` (gotcha de `-0` em JavaScript, falsy mas `Intl.NumberFormat` mostra o sinal) | `\|\| 0` normalizado em todos os pontos de negação de valor em `use-calendar.ts` |
| 9 | Auditoria geral | `<button>` do `UserMenu` sem `type="button"` — mesma classe de bug do #1 | `type="button"` explícito |
| 10 | Auditoria geral | 7 hooks de mutação (transações, faturas, empréstimos, financiamentos, metas, aportes de meta, recorrências) não invalidavam `["calendar"]`, deixando o Calendário com dados potencialmente desatualizados após ações em outros módulos | `queryClient.invalidateQueries({ queryKey: ["calendar"] })` adicionado às 7 funções `useInvalidate<Modulo>()` |

### Achados documentados, não corrigidos nesta sessão (pendências reais, não bugs silenciosos)

- **66 policies de RLS** ainda usam `auth.uid()` em vez de `(select
  auth.uid())` (otimização de performance do Postgres/Supabase —
  avaliada, aplicada só em `transactions` na migration `0027`; mudança
  ampla demais para decidir às pressas numa única sessão).
- **16 FKs sem índice** e **18 índices não utilizados**, ambos achados
  do `get_advisors` (performance) — não corrigidos, requerem análise de
  uso real antes de indexar/remover.
- `v_monthly_summary`/`v_category_summary` não excluem transações com
  `deleted_at` preenchido (soft delete) — potencial pequena divergência
  se algum dia uma transação for excluída num período já fechado;
  não reproduzido com dado real, documentado como observação.
- `profiles.theme`/`currency`/`language` continuam sem sincronização
  real com `next-themes`/sem efeito no app — decisão consciente desta
  sessão (seção 7.1), não um bug.
- `useLocalStorage("last-account-id")` não é escopado por usuário nem
  limpo no logout — bug pré-existente de baixo impacto real,
  documentado, fora do escopo dos módulos desta sessão.

### Padrões que NÃO devem ser quebrados

- **Derivar dados atualizados da lista/query já buscada em vez de
  guardar um snapshot em `useState`** — causou o bug #5 e quase se
  repetiu; nos módulos seguintes (Investimentos, Empréstimos/
  Financiamentos) o padrão correto (`useState<string | null>` para o id
  + `.find()`) já foi aplicado desde o início.
- **Nunca tocar em `apply_transaction_balance`,
  `_transaction_balance_effect`, `apply_transfer_balance`** sem bateria
  completa de regressão financeira antes e depois.
- **Investigar functions/triggers via `pg_get_functiondef` antes de
  assumir comportamento** — toda decisão de design nos 4 módulos da
  Fase 4 (SAC/Price, sincronização de atraso, isolamento de saldo) veio
  de ler o código-fonte real da trigger primeiro, nunca de suposição.
- **Testar ownership empiricamente (dois usuários descartáveis) antes de
  propor migration** — evitou 4 migrations desnecessárias (seção 8).
- **Validar fórmulas financeiras fora do banco antes de gravar dado
  real** — as fórmulas SAC/Price foram testadas em Node (5 cenários,
  conferindo soma exata e saldo final zero) antes de qualquer INSERT.
- Seguir sempre `repository → service → hook → component/page`; nenhuma
  tela chama `supabase` diretamente.
- Centralizar invalidação de TanStack Query numa função
  `useInvalidate<Modulo>()` por módulo, chamada em todo `onSuccess`.
- Usar sempre `getErrorMessage()` de `src/lib/errors.ts` para exibir
  erros do Supabase de forma amigável.
- **Não usar `git add -A`/`git add .`** — sempre listar os arquivos
  explicitamente no commit, para não incluir nada fora do escopo do
  módulo (seguido rigorosamente em todos os 4 commits da Fase 4).
- **Nunca force push. Nunca push para `main`.**
- **Não inventar comportamento que o schema não suporta** — quando uma
  regra não era determinável (unidade de `interest_rate`, se
  Empréstimos e Financiamentos deveriam ser uma tela ou duas), a decisão
  tomada foi documentada explicitamente como tal, não apresentada como
  fato confirmado.

---

## 12. O que foi revertido nesta sessão de handoff

Ao iniciar esta sessão de handoff, havia uma edição **não commitada**
em `src/hooks/use-transactions.ts` — início abandonado da implementação
de Planejamento/Orçamento (adição de `queryClient.invalidateQueries({
queryKey: ["budgets"] })` na função `useInvalidateTransactions`). Como
esta sessão foi instruída a não alterar código, essa edição órfã foi
**revertida** (`git checkout -- src/hooks/use-transactions.ts`) para
deixar a working tree exatamente no estado do commit `8a0c9f4`. A
próxima sessão pode reaplicar essa mudança (ela é conceitualmente
correta e necessária — ver seção 13.1) como parte da implementação real
de Planejamento/Orçamento, com testes completos.

---

## 13. Análise técnica dos 4 módulos da Fase 4 — todos ✅ CONCLUÍDOS

As 4 subseções abaixo registram, por completude histórica, a análise
feita **antes** de cada implementação (schema, triggers, decisões de
design) e o resultado real depois de implementado. **Todos os 4 módulos
estão concluídos — não há mais nada pendente aqui.** Para a próxima
fase do projeto (ainda não definida), ver seção 14.

### 13.1 Planejamento/Orçamento — ✅ CONCLUÍDO

Implementado por completo (`/planejamento`): CRUD de orçamento por
categoria/mês/ano, "realizado" derivado ao vivo de `v_category_summary`
(mesma fonte do Dashboard), percentual/saldo restante/faixa de saúde
(verde/amarelo/vermelho, limiares 50/90%) sempre calculados na
renderização, KPIs, estados vazio/loading, mobile, dark mode. Testado
com dados financeiros reais (cascata de alertas 50→100%, monotonicidade)
e segurança multiusuário (achado de ownership em `category_id` avaliado
e confirmado sem impacto real, sem migration). Detalhamento completo em
`docs/MODULO_4.md` Parte 5 (seções 30-36) — **não repita esta
investigação**, a análise abaixo é o registro histórico de antes da
implementação.

<details>
<summary>Investigação original (antes da implementação) — histórico</summary>

- **Tabela:** `budgets` — `user_id`, `category_id` (FK `ON DELETE
  CASCADE`, diferente do padrão `SET NULL` de outras tabelas),
  `month`/`year` (smallint, CHECK `month between 1 and 12`),
  `planned_amount`, 4 flags booleanas (`alert_50_sent`, `alert_75_sent`,
  `alert_90_sent`, `alert_100_sent`), `UNIQUE(user_id, category_id,
  month, year)`.
- **Sem coluna de status/ativo/inativo** — não há "desativar orçamento"
  no schema.
- **Sem coluna "valor realizado"** — o gasto real **nunca é armazenado**,
  sempre recalculado por agregação. A trigger `check_budget_alerts`
  (lida via `pg_get_functiondef` nesta sessão, texto completo abaixo)
  computa `spent` assim:
  ```sql
  select coalesce(sum(amount),0) from transactions
  where user_id = X and category_id = Y and type = 'despesa' and status = 'pago'
    and extract(month from date) = month and extract(year from date) = year
  ```
  **O frontend precisa calcular o "realizado" exatamente da mesma
  forma** (mesmo filtro: `despesa` + `pago` + mês/ano da coluna `date`),
  para bater com o que a trigger usa para decidir os alertas.
- **Trigger `check_budget_alerts`** (`AFTER INSERT/UPDATE` em
  `transactions`, `SECURITY INVOKER`): só reage quando
  `type='despesa' AND status='pago' AND category_id IS NOT NULL`. Busca
  o orçamento do mês/ano/categoria da transação; se `spent/planned >=`
  50/75/90/100% e a flag correspondente ainda não foi enviada, insere em
  `notifications` e marca a(s) flag(s) (marca em cascata: atingir 100%
  marca as 4 flags de uma vez). **Nunca reseta as flags** — mesmo padrão
  monotônico de `check_goal_completion`. **Não reage a `DELETE`** de
  transação nem a `UPDATE` de `budgets.planned_amount` — se o usuário
  excluir a transação que estourou o orçamento ou aumentar o valor
  planejado depois, as flags **não se resetam automaticamente** (mesmo
  comportamento monotônico; documentar, não "corrigir" sem necessidade
  comprovada — seria alterar uma trigger financeira).
- **RLS:** padrão `user_id = auth.uid()`, 4 policies. `budgets` é tabela
  **folha** — nenhuma outra tabela tem FK para `budgets`, então **não
  há necessidade de investigar lacuna de ownership tipo "tabela filha"**
  aqui (diferente de Metas/Investimentos/Empréstimos).
- **Requisito explícito já dado pelo usuário:** "Não permita que o
  orçamento fique mostrando valores desatualizados após uma transação."
  Implica: qualquer mutação de transação (criar/editar/excluir/mudar
  status) deve invalidar a query de orçamentos. **Já identificado**: a
  função `useInvalidateTransactions()` em `src/hooks/use-transactions.ts`
  precisa incluir `queryClient.invalidateQueries({ queryKey: ["budgets"] })`
  — é uma mudança de uma linha, pequena e cirúrgica (não é uma
  reescrita), consistente com como outros módulos já se conectaram a
  transações (ex.: `["recurring-rules"]` já está lá).
- **0 linhas** em `budgets` hoje (confirmado nesta sessão).
- **Sugestão de desenho** (não vinculante, a próxima sessão decide):
  página `/planejamento` com navegador de mês/ano (padrão já usado no
  Dashboard), lista de orçamentos por categoria com barra de progresso
  planejado×realizado (cores por faixa: verde <50%, amarelo 50-90%,
  vermelho >90%), form de criar/editar (categoria — provavelmente
  filtrada para tipo `despesa`, mês/ano, valor planejado), exclusão.
  Repository precisa de um método de agregação em lote (buscar o
  "realizado" de todos os orçamentos do período numa query só, evitando
  N+1 — mesmo cuidado já tomado em `countUsageBatch` de Tags/Centros de
  Custo).

</details>

### 13.2 Calendário — ✅ CONCLUÍDO

Implementado por completo (`/calendario`): grade de mês customizada
(date-fns), navegação por mês, agregação de 6 fontes de eventos
(transações, faturas, parcelas de empréstimo/financiamento, metas,
recorrências) sem tabela de eventos nova e sem N+1 (6 queries paralelas
por mês exibido), `Sheet` de detalhe do dia com navegação para o módulo
de origem, mobile, dark mode. Detalhamento completo em
`docs/MODULO_4.md` Parte 8 (seções 47-52) — **não repita esta
investigação**, a análise abaixo é o registro histórico de antes da
implementação (as decisões nela indicadas — usar `formatDate()`
existente para timezone, várias queries paralelas em vez de view nova,
mostrar só a próxima ocorrência de recorrência — foram todas seguidas).

<details>
<summary>Investigação original (antes da implementação) — histórico</summary>

**Não existe tabela "eventos" dedicada no banco.** Um calendário real
precisaria agregar de várias fontes já existentes:

- `transactions.due_date` (contas a pagar/receber) — via
  `v_transactions_enriched` ou `v_pending_by_due_date`.
- `card_invoices.due_date` (vencimento de fatura).
- `loan_installments.due_date` / `financing_installments.due_date`
  (parcelas de empréstimo/financiamento).
- `goals.target_date` (prazo de meta, se não nulo).
- `recurring_rules.next_run_date` (próxima ocorrência de recorrência —
  mas é só a *próxima*, não um cronograma completo; teria que ser
  calculada com `_next_recurrence_date` ou simulada no frontend para
  mostrar múltiplos meses à frente — **investigar antes de implementar**
  se isso é viável sem custo alto).
- **Não investigado ainda:** `budgets` não tem data de vencimento (é só
  mês/ano), então não gera "evento" pontual.
- **A investigar na próxima sessão antes de codificar:** timezone das
  colunas `date` (tipo `date` do Postgres, sem timezone — mas o
  JavaScript `new Date("YYYY-MM-DD")` interpreta como UTC meia-noite,
  podendo exibir o dia anterior em fusos negativos; o projeto já tem
  `formatDate()` em `src/lib/format.ts` que trata isso — **usar o mesmo
  padrão**, não reinventar).
- **Risco:** juntar 5+ fontes de dados diferentes numa view de calendário
  sem N+1 — provavelmente precisa de várias queries em paralelo (uma por
  fonte) em vez de uma view SQL nova (evitar criar view/migration sem
  necessidade comprovada).

</details>

### 13.3 Relatórios — ✅ CONCLUÍDO

Implementado por completo (`/relatorios`): visão geral do período
(KPIs + evolução mensal com intervalo de mês/ano selecionável),
despesas/receitas por categoria (mês único, pizza + ranking), fluxo de
caixa (intervalo de datas livre), patrimônio (detalhado por
componente). Todas as 4 seções reaproveitam as views já usadas pelo
Dashboard — nenhum cálculo financeiro novo no frontend. Detalhamento
completo em `docs/MODULO_4.md` Parte 6 (seções 37-43) — **não repita
esta investigação**.

**Correção importante a uma afirmação da análise preliminar abaixo:**
o texto original desta seção (escrito antes da implementação) afirmava
"`v_net_worth` já soma corretamente Investimentos e
Empréstimos/Financiamentos — confirmado nesta sessão" — essa
confirmação foi baseada só na **leitura do SQL da view**, não em um
teste real como usuário `authenticated`. Quando testada de fato nesta
sessão (Relatórios), a view falhava com `permission denied for table
users` para **qualquer** usuário real — bug real desde a Fase 1,
corrigido nesta sessão (`docs/BANCO_DE_DADOS.md` seção 32). Lição
registrada: ler o SQL de uma view/function não substitui testá-la
como o role que a consome de verdade.

<details>
<summary>Investigação original (antes da implementação) — histórico, com uma afirmação já corrigida acima</summary>

**Views já existentes e documentadas** (`docs/BANCO_DE_DADOS.md` seção
7), todas `security_invoker = true`:

- `v_monthly_summary` — receita/despesa/saldo por mês (já usada no
  Dashboard, gráfico de barras).
- `v_category_summary` — gasto por categoria/mês/tipo (já usada no
  Dashboard, gráfico de pizza).
- `v_net_worth` — patrimônio líquido (contas + investimentos + a receber
  − a pagar − financiamentos). **Já soma corretamente Investimentos e
  Empréstimos/Financiamentos** (confirmado nesta sessão, view não foi
  alterada por nenhum módulo da Fase 4).
- `v_card_usage` — limite usado/disponível por cartão (usada em
  Cartões, sem consumidor em Relatórios ainda).
- `v_transactions_enriched` — listagem detalhada (usada em Transações,
  Dashboard, Cartões).
- `v_cash_flow_daily` — entradas/saídas/líquido por dia (**sem
  consumidor no frontend ainda** — candidata natural para um relatório
  de fluxo de caixa).
- `v_pending_by_due_date` — contas a pagar/receber por vencimento (usada
  no Dashboard).
- **Regra explícita do usuário para este módulo:** "Todo número
  apresentado deve possuir uma fonte de verdade clara" e "evite cálculos
  divergentes do Dashboard" — **reaproveitar as mesmas views/repositories
  já usados no Dashboard** (`dashboard.repository.ts`) em vez de
  recalcular os mesmos números de outra forma.
- **Não investigado ainda:** exportação (CSV/PDF) — não há nenhuma
  infraestrutura existente no projeto para isso; se for pedido,
  precisará de uma biblioteca nova (avaliar necessidade real antes de
  adicionar dependência, conforme regra "não adicionar dependências sem
  necessidade").
- **Módulos sem view agregada própria ainda:** Metas, Investimentos,
  Empréstimos/Financiamentos não têm view — os KPIs desses módulos hoje
  são calculados no frontend a partir da lista completa (aceitável pelo
  volume esperado, mesmo padrão dos próprios módulos). Um relatório que
  cruze esses dados precisaria buscar cada lista separadamente.

</details>

### 13.4 Configurações — ✅ CONCLUÍDO

Implementado por completo (`/configuracoes`): Perfil (nome/avatar),
Aparência (tema via `next-themes` diretamente, decisão (a)/(b)/(c) da
análise original resolvida como uma combinação: tema **não** sincroniza
com `profiles.theme` — permanece só `next-themes` —, `monthly_goal`/
`annual_goal` **ganharam** um consumidor real (form + card de
progresso), `currency`/`language` permanecem **não editáveis** (opção
(c), sem efeito real no app hoje). Segurança (troca de senha via
`supabase.auth.updateUser()`, exatamente como recomendado abaixo).
Exclusão de conta **não implementada** — confirmado como fora do
escopo, mantido como `[Requer confirmação]` em
`docs/REGRAS_DE_NEGOCIO.md`. Detalhamento completo em
`docs/MODULO_4.md` Parte 7 (seções 44-46) — **não repita esta
investigação**.

<details>
<summary>Investigação original (antes da implementação) — histórico</summary>

**Tabela `profiles`** (confirmado via `information_schema` nesta sessão)
— única fonte real de "configurações" no banco:

```
id (= auth.users.id), full_name, avatar_url,
currency (default 'BRL'), language (default 'pt-BR'), theme (default 'system'),
monthly_goal, annual_goal, created_at, updated_at
```

- **Sem tabela de "notificações configuráveis"** nem "segurança" — a
  tabela `notifications` guarda os eventos já disparados (por
  `check_budget_alerts`, futuramente outras triggers), não preferências
  de quais notificações o usuário quer receber.
- **Autenticação/senha:** deve ser feita **exclusivamente via
  `supabase.auth.updateUser()`** (já existe o padrão de
  `AuthProvider`/`useAuth` em `src/contexts/`) — **nunca** manipular
  senha diretamente numa tabela própria.
- **`theme`/`monthly_goal`/`annual_goal` — checado nesta sessão
  (Relatórios), resposta pronta para a próxima:** `grep -r
  "monthly_goal\|annual_goal\|profiles\.theme" src/` só encontra
  ocorrências em `database.types.ts` (tipo gerado) — **nenhum componente
  do app lê nem escreve essas 3 colunas hoje**. `theme-provider.tsx` usa
  `next-themes` com `attribute="class"` e `enableSystem`, controlado só
  por `localStorage`, **sem nenhuma leitura/escrita de `profiles.theme`**
  — são dois sistemas de fato desconectados, não só "possivelmente".
  Antes de construir UI para esses campos, decidir com o usuário: (a)
  sincronizar `profiles.theme` com o `next-themes` real, (b) usar
  `monthly_goal`/`annual_goal` em algum KPI do Dashboard/Relatórios, ou
  (c) tratar as 3 colunas como não utilizadas e não expor UI para elas
  ainda. Não presumir qual — nenhuma das 3 opções tem evidência de ser
  "a" resposta certa só pelo schema.
- **Exclusão de conta:** não investigado — decidir com cautela (ação
  destrutiva irreversível envolvendo `auth.users` e cascata em todas as
  tabelas de domínio); provavelmente **fora do escopo de uma primeira
  versão**, registrar como `Requer confirmação` se não houver
  informação suficiente para decidir.

</details>

---

## 14. Fase 4 concluída — possíveis próximos passos (sem ordem definida)

Todos os 8 módulos da Fase 4 estão implementados, testados e
documentados (seção 13). **Não há um backlog de "próxima fase"
definido pelo usuário até o momento desta atualização.** Itens abaixo
são candidatos honestos, não uma decisão — a próxima sessão deve
confirmar com o usuário antes de escolher um:

1. **Dívida técnica documentada e não corrigida** (seção 11, "Achados
   documentados") — a mais concreta e de menor risco para atacar
   primeiro: as 66 policies de RLS com `auth.uid()` não otimizado, os 16
   FKs sem índice, os 18 índices não utilizados. Todas são melhorias de
   performance, não mudam comportamento — mas exigem teste de regressão
   cuidadoso por serem uma mudança ampla (dezenas de policies).
2. **`v_monthly_summary`/`v_category_summary` e soft delete** — avaliar
   se excluir transações com `deleted_at` preenchido dos agregados é o
   comportamento correto (parece que sim, mas precisa confirmar com o
   usuário se há algum caso de uso que depende do comportamento atual).
3. **Funcionalidades novas fora do escopo original da Fase 4** —
   exportação de relatórios (CSV/PDF, mencionado como não investigado na
   seção 13.3), exclusão de conta (Configurações, seção 13.4), projeção
   de múltiplas ocorrências futuras de recorrências no Calendário (hoje
   mostra só a próxima) — nenhuma delas tem requisito confirmado, todas
   precisam de decisão explícita do usuário antes de implementar.
4. **Deploy real** — o projeto ainda não tem frontend em produção nem
   CI/CD (seção 1); só o banco Supabase está em produção. Se o próximo
   passo for "colocar no ar", este documento não cobre esse processo.

A próxima sessão deve perguntar ao usuário qual direção seguir antes de
escolher — nenhuma das opções acima foi validada como prioridade.

---

## 15. Padrão de qualidade — repetir para qualquer novo módulo/mudança

**Não é sobre velocidade. É sobre qualidade.** Qualquer trabalho futuro
no projeto deve seguir exatamente o mesmo ciclo já usado nos 8 módulos
da Fase 4 (Cartões, Metas, Investimentos, Empréstimos/Financiamentos,
Orçamento, Relatórios, Configurações, Calendário):

1. Investigar schema real (`information_schema`, não só `database.types.ts`).
2. Ler o código-fonte de toda function/trigger relevante
   (`pg_get_functiondef`) antes de presumir comportamento.
3. Verificar RLS/policies da(s) tabela(s) envolvida(s).
4. Se houver tabela filha nova, **testar ownership empiricamente** com
   dois usuários descartáveis **antes** de decidir se precisa de
   migration (lição da seção 8 — pode não precisar).
5. Implementar em camadas: `repository → service → hook →
   component/page`.
6. `npx tsc -b --noEmit` (0 erros).
7. `npm run lint` (0 erros, comparar warnings com o baseline de 4
   pré-existentes).
8. `npm run build` (sucesso).
9. Testes financeiros reais no banco (não só análise estática) —
   comparar saldo/valor antes vs. esperado vs. obtido.
10. Testes de segurança multiusuário reais (dois usuários descartáveis,
    ataques de SELECT/UPDATE/DELETE/INSERT cruzado).
11. Testes de UI no navegador (fluxo principal, edição, exclusão,
    estados vazios/loading/erro).
12. Mobile (~375px, sem overflow horizontal).
13. Dark mode.
14. Console sem erros novos (comparar com o padrão pré-existente de
    `403`/`406` esporádicos documentado).
15. Remover **todos** os dados de teste, confirmar contagem zero.
16. Documentar decisões, fórmulas, limitações e pendências reais em
    `docs/MODULO_4.md` (nova parte) + atualizar `BANCO_DE_DADOS.md`/
    `REGRAS_DE_NEGOCIO.md`/`CONTEXTO_PROJETO.md` conforme necessário.
17. Commit isolado por módulo, arquivos listados explicitamente (nunca
    `git add -A`).
18. Push **somente** para `origin/develop`. Nunca `main`, nunca
    `--force`.

**Regra fundamental:** se uma regra de negócio não puder ser determinada
pelo schema/código/documentação existente, **não inventar** — registrar
como `Requer confirmação` e continuar o resto que puder ser feito com
segurança (padrão já seguido em `interest_rate` de Financiamentos e
fonte de verdade de Investimentos).

---

## CHECKLIST — PRÓXIMA SESSÃO

**A Fase 4 está 100% concluída e o sistema passou por uma auditoria de
pré-produção completa (`docs/PRE_PRODUCAO.md`) — não há um próximo
módulo predefinido.** Os passos manuais que restam antes do primeiro
deploy real (criar/conectar projeto Vercel, configurar variáveis de
ambiente, configurar Site URL/Redirect URLs e Leaked Password
Protection no Supabase Auth) estão listados em `docs/PRE_PRODUCAO.md`
seção 6 — não são executáveis por um agente. A primeira coisa a fazer
na próxima sessão é **perguntar ao usuário** qual direção seguir (ver
seção 14 para candidatos honestos, ou se o usuário já fez o deploy
manual e quer validação pós-deploy). Não presuma um módulo específico.

- [ ] Ler este arquivo (`HANDOFF_CONTINUIDADE.md`) por completo
- [ ] Ler `docs/PRE_PRODUCAO.md` se a tarefa envolver deploy, segurança
      ou performance
- [ ] Confirmar `git branch --show-current`, `git status`, `git log -10`
- [ ] Confirmar `git ls-remote origin` (branch `develop` = HEAD local;
      `main` = `eb92bfa`)
- [ ] Confirmar working tree limpo
- [ ] Perguntar ao usuário qual é o próximo objetivo (seção 14) antes de
      escolher qualquer trabalho
- [ ] Se o trabalho envolver banco: inspecionar o schema real antes de
      codificar, mesmo que a documentação já pareça cobrir o caso
- [ ] Investigar functions/triggers relevantes via `pg_get_functiondef`
      antes de presumir comportamento
- [ ] Investigar RLS/policies antes de qualquer mudança de segurança
- [ ] Se houver tabela filha nova: testar ownership empiricamente antes
      de decidir sobre migration
- [ ] Implementar em camadas (`repository → service → hook →
      component/page`)
- [ ] TypeScript (0 erros)
- [ ] ESLint (0 erros, comparar com baseline de 4 warnings)
- [ ] Build (sucesso)
- [ ] Testes financeiros reais no banco, se aplicável
- [ ] Testes de segurança multiusuário reais, se aplicável
- [ ] Testes de UI no navegador, se aplicável
- [ ] Mobile (~375px)
- [ ] Dark mode
- [ ] Console sem erros novos
- [ ] Remover dados de teste, confirmar contagem zero
- [ ] Atualizar documentação (`MODULO_4.md`, `BANCO_DE_DADOS.md`,
      `REGRAS_DE_NEGOCIO.md`, `CONTEXTO_PROJETO.md`, `ARQUITETURA.md`,
      este arquivo)
- [ ] Commit isolado por unidade de trabalho, arquivos listados
      explicitamente (nunca `git add -A`/`git add .`)
- [ ] Push **somente** para `origin/develop`. Nunca `main`, nunca
      `--force`
- [ ] Relatório honesto do que foi feito
