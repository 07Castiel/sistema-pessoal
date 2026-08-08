# HANDOFF DE CONTINUIDADE — Meu Financeiro

> **Ponto de entrada principal da próxima sessão.** Escrito para permitir que
> outro Claude Code continue o projeto **sem depender do histórico desta
> conversa**. Todos os dados abaixo foram confirmados via `git`, `package.json`
> e os documentos existentes (`docs/CONTEXTO_PROJETO.md`,
> `docs/MODULO_3.md`) no momento da escrita — nada foi inventado.
>
> **Escrito em:** 2026-08-08, encerramento de sessão por limite de contexto
> (~80%). Sessão dedicada exclusivamente a este handoff — nenhum código
> funcional, banco, migration ou refactor foi alterado.

---

## 1. Identidade do projeto

- **Nome:** Meu Financeiro
- **Objetivo:** aplicativo de gestão financeira pessoal completa — contas,
  categorias, transações (receitas/despesas), recorrências, tags, centros de
  custo, anexos, e (no domínio de dados, ainda sem UI) cartões/faturas,
  investimentos, empréstimos/financiamentos, metas e orçamento.
- **Frontend:** React 19 + TypeScript (modo `strict`), Vite 8.
- **Backend:** Supabase — Postgres 17.6, Auth, Storage. Nenhum backend
  próprio (Node/API): o frontend fala diretamente com o Supabase via
  `supabase-js`, sempre atrás da camada `repository`.
- **Banco:** Postgres 17.6 gerenciado pelo Supabase, RLS habilitado em 100%
  das tabelas de domínio.
- **Autenticação:** Supabase Auth (e-mail/senha) — login, cadastro,
  recuperação de senha.
- **UI:** TailwindCSS v4 + shadcn/ui (estilo "new-york", Radix primitives),
  dark/light/automático.
- **Gerenciamento de estado:** TanStack Query v5 para estado de servidor
  (nenhum Redux/Zustand); React Hook Form para estado de formulário.
- **Validação:** Zod, um schema por formulário em `src/schemas/`.
- **Build:** Vite. Script `npm run build` executa `tsc -b && vite build`.
- **Deploy:** **ainda não realizado.** Não há `.vercel/` nem `vercel.json`
  no repositório — nenhuma configuração de deploy de frontend encontrada.
  O único serviço já em produção é o **banco Supabase remoto**.

---

## 2. Estado atual

| Item | Estado |
|---|---|
| Branch atual | `develop` |
| Último commit (antes deste handoff) | `58936f2 feat(financeiro): conclui fase 3 de receitas e despesas` |
| Fase 1 (Contas) | ✅ Concluída |
| Fase 2 (Categorias) | ✅ Concluída |
| Fase 3 (Receitas/Despesas + finalização) | ✅ **CONCLUÍDA** |
| Fase 4 | ⛔ **Ainda NÃO começou** |
| Working tree | Limpo (antes deste handoff) |
| GitHub | Remote `origin` configurado, **desatualizado** — ver seção 12 |
| Supabase | Projeto remoto ativo, 35 migrations aplicadas |

**Deixando explícito, conforme pedido:** a Fase 3 está concluída. A Fase 4
ainda não foi iniciada e **não deve ser iniciada automaticamente** — exige
definição de escopo com o usuário primeiro (seção 15).

---

## 3. Histórico de commits

```
eb92bfa feat: initial finance management system
58936f2 feat(financeiro): conclui fase 3 de receitas e despesas
```

- **`eb92bfa`** — commit inicial. Scaffold completo do projeto (Vite + React
  + TS + Tailwind + shadcn/ui), schema inicial do banco (migrations
  `0001`-`0012`), autenticação, e as Fases 1 (Contas) e 2 (Categorias)
  completas.
- **`58936f2`** — fecha a Fase 3. 45 arquivos (14 modificados + 31 novos):
  núcleo de transações (receitas/despesas), recorrências, tags, centros de
  custo, anexos integrados, dashboard com dados reais, e a documentação
  (`docs/CONTEXTO_PROJETO.md`, `docs/MODULO_3.md`) descrevendo tudo em
  detalhe. Migration de banco associada (`0035`) já estava aplicada
  remotamente antes deste commit — o commit é só o código/documentação.

---

## 4. Banco de dados

**Project ref:** `xocehjrujmaxhwqhxelo` (região `sa-east-1`, organização
`cssqqcuqapqhrsjmuajd`, plano free).

- **Migrations:** 35 aplicadas (`0001` a `0035`), nenhuma apagada. Faixas:
  `0001`-`0012` schema inicial completo; `0013`-`0020` Módulo 1 (Contas);
  `0021`-`0023` Módulo 2 (Categorias); `0024`-`0033` Fase 3 (Transações);
  `0034` hardening de segurança (least-privilege); `0035` finalização Fase 3
  (`cost_centers.active`). **Não reaplicar `0034` nem `0035`.**
- **Tabelas:** 24 em `public`, todas com RLS habilitado. As com dado real
  hoje: `profiles`, `accounts`, `categories` (16 categorias padrão),
  `audit_logs`. As demais 20 tabelas do domínio (transações, recorrências,
  tags, centros de custo, anexos, cartões, investimentos, empréstimos,
  metas, orçamento, etc.) existem com schema completo mas sem dados reais
  além do que o usuário for criando pelo uso normal do app.
- **Enums importantes:** `account_type`, `account_status`, `category_type`,
  `transaction_type` (**só `receita`/`despesa`**, de propósito — ver
  `docs/MODULO_3.md`), `transaction_status` (`pendente`,`pago`,`recebido`,
  `cancelado`,`atrasado` — `atrasado` nunca é gravado, é sempre derivado),
  `payment_method`, `recurrence_frequency`, `priority_level`, `card_brand`,
  `invoice_status`, `billing_cycle`, `investment_type`,
  `investment_movement_type`, `loan_type`, `loan_status`,
  `installment_status`, `amortization_type`, `notification_type`.
- **Views (7):** `v_monthly_summary`, `v_category_summary`, `v_net_worth`,
  `v_card_usage`, `v_transactions_enriched`, `v_cash_flow_daily`,
  `v_pending_by_due_date` — todas `security_invoker = true`.
- **Functions/RPCs chamáveis pelo frontend** (`authenticated` apenas):
  `create_installment_transactions`, `generate_due_recurrences`,
  `reconcile_account`, `reorder_categories`, `_next_recurrence_date`.
- **Functions internas** (triggers, `SECURITY DEFINER`, sem `EXECUTE` para
  ninguém além do disparo automático): `audit_trigger_fn`,
  `handle_new_user`, `enforce_category_type_consistency`,
  `prevent_category_type_change_with_children`,
  `prevent_deep_category_nesting`,
  `prevent_delete_category_with_active_children`,
  `prevent_last_account_delete`, `prevent_transaction_on_deleted_account`,
  `validate_transaction_references`.
- **As 11 functions legadas de saldo/updated_at/recálculo** (`SECURITY
  INVOKER`): ver seção 5 (Segurança) — tratamento especial, migration `0034`.
- **Triggers relevantes em `transactions`:** `trg_transactions_balance`
  (saldo, delta), `trg_recalc_invoice_total`, `trg_check_budget_alerts`,
  `trg_set_updated_at`, `trg_prevent_transaction_on_deleted_account`,
  `trg_normalize_transaction_paid_date`,
  `trg_validate_transaction_references`, `trg_validate_transaction_status`,
  `trg_audit_transactions`. Detalhamento completo por tabela em
  `docs/CONTEXTO_PROJETO.md`, seção 7.
- **RLS:** 4 policies por tabela (select/insert/update/delete),
  `user_id = (select auth.uid())`. Tabelas da Fase 2/3 usam a forma
  otimizada `(select auth.uid())`; tabelas mais antigas (Fase 1/Módulo 1)
  ainda usam `auth.uid()` solto — não é bug, é otimização não retroagida.
- **Storage:** bucket único `attachments`, privado, 10 MB por arquivo,
  policies por `{user_id}/...` (`storage.foldername`).

---

## 5. Segurança

- **RLS:** habilitada em todas as 24 tabelas de `public`. Padrão
  `user_id = (select auth.uid())` (ou subquery de ownership para tabelas
  sem `user_id` direto, como `transaction_tags`).
- **Ownership:** além do RLS, a trigger `validate_transaction_references`
  garante que `account_id`/`category_id`/`cost_center_id`/`card_id` de uma
  transação pertencem ao mesmo usuário — RLS sozinho não bastava (vulnerabi-
  lidade real encontrada e corrigida na Fase 3, migration `0025`).
- **`SECURITY INVOKER`:** todas as 11 functions legadas de saldo/recálculo/
  updated_at são `SECURITY INVOKER` (rodam com o privilégio de quem chamou,
  não do dono da function) — nenhuma é `SECURITY DEFINER` sem necessidade.
- **`search_path`:** fixado explicitamente (`search_path=public`) nas 11
  functions legadas desde a migration `0011`, mitigando search-path
  hijacking.
- **Migration `0034` (`revoke_public_execute_legacy_trigger_functions`):**
  **10 das 11 functions legadas são `RETURNS trigger`** — tiveram `EXECUTE`
  revogado de `PUBLIC`/`anon`/`authenticated` (disparo de trigger não
  depende de `EXECUTE`, então nada quebrou). São elas: `set_updated_at`,
  `apply_transaction_balance`, `apply_transfer_balance`,
  `recalc_invoice_total`, `apply_investment_movement`,
  `check_budget_alerts`, `check_goal_completion`,
  `recalc_financing_balance`, `recalc_goal_amount`, `recalc_loan_balance`.
  **A 11ª, `_transaction_balance_effect`, é `RETURNS numeric`** (não é
  trigger) e **mantém `EXECUTE` para `authenticated`** porque é chamada
  explicitamente de dentro de `apply_transaction_balance`
  (`SECURITY INVOKER`) — revogar dessa role quebraria toda inserção/edição/
  exclusão de transação (`permission denied for function
  _transaction_balance_effect`). **Não modificar essa arquitetura sem nova
  análise** — se `_transaction_balance_effect` for refatorada no futuro,
  essa concessão precisa ser reavaliada.
- **Validação multiusuário:** testada nesta e em sessões anteriores com
  usuários descartáveis (`auth.users`), operações como role `authenticated`
  real (não `postgres`), cobrindo tags, centros de custo, transações,
  recorrências e anexos. Resultado: leitura sem filtro = 0 linhas de outro
  usuário; `UPDATE`/`DELETE` por ID direto nos dados de outro usuário =
  0 linhas afetadas, dados permanecem intactos. Todos os usuários e dados
  de teste foram removidos ao final de cada sessão (contagem zero
  confirmada).
- **Storage privado:** bucket `attachments` (`public: false`), policies de
  `storage.objects` restringem cada usuário à própria pasta.
- **`.env`:** corretamente listado no `.gitignore`, nunca rastreado pelo
  git. Só `.env.example` (vazio, sem segredo) está versionado.

---

## 6. Funcionalidades existentes

| Módulo | Status | Observação |
|---|---|---|
| Dashboard | **IMPLEMENTADO** | Dados reais das views da Fase 3, navegação de período, KPIs, gráficos |
| Contas | **IMPLEMENTADO** | Fase 1 — CRUD, soft delete, reconciliação, histórico |
| Categorias | **IMPLEMENTADO** | Fase 2 — CRUD, hierarquia 1 nível, drag-and-drop, lixeira |
| Transações (receitas/despesas) | **IMPLEMENTADO** | Fase 3 — CRUD completo, parcelamento, filtros, busca, paginação |
| Recorrências | **IMPLEMENTADO** | Fase 3 — CRUD, pausar/reativar/encerrar, gerar sob demanda, lixeira |
| Tags | **IMPLEMENTADO** | Fase 3 — CRUD, associação a transações, filtro |
| Centros de custo | **IMPLEMENTADO** | Fase 3 — CRUD, ativar/desativar, associação, filtro |
| Anexos | **IMPLEMENTADO** | Integrado ao formulário de transação; já existia em Contas desde o Módulo 1 |
| Cartões / Faturas | **BACKEND EXISTENTE** | Tabelas `credit_cards`/`card_invoices` e view `v_card_usage` prontas; UI é `ComingSoon` |
| Investimentos | **BACKEND EXISTENTE** | Tabelas `investments`/`investment_movements` e trigger `apply_investment_movement` prontos; UI é `ComingSoon` |
| Empréstimos/Financiamentos | **BACKEND EXISTENTE** | Tabelas `loans`/`loan_installments`/`financings`/`financing_installments` prontas; UI é `ComingSoon` |
| Metas | **BACKEND EXISTENTE** | Tabelas `goals`/`goal_contributions` e trigger `check_goal_completion` prontos; UI é `ComingSoon` |
| Orçamento/Fluxo de caixa | **BACKEND EXISTENTE** | Tabela `budgets`, trigger `check_budget_alerts`, view `v_cash_flow_daily` prontos; UI é `ComingSoon` |
| Calendário, Relatórios, Configurações | **AINDA NÃO IMPLEMENTADO NA UI** | Placeholders `ComingSoon`, sem schema dedicado além do que as outras tabelas já cobrem |
| Transferências entre contas | **BACKEND EXISTENTE** | Tabela `transfers` e trigger de saldo dedicado prontos; sem UI |

**Importante:** a existência de uma tabela no banco **não** significa que o
módulo de frontend está pronto. Todos os itens marcados "BACKEND EXISTENTE"
têm apenas o placeholder `ComingSoon` na tela correspondente.

---

## 7. Fase 3 — o que foi concluído (detalhado)

### Recorrências (`/recorrencias`)
CRUD completo (criar/editar), pausar, reativar, encerrar, botão "gerar
agora" (chama a RPC `generate_due_recurrences`), **idempotência confirmada**
(gerar duas vezes no mesmo dia não duplica), lixeira e restauração
(histórico de ocorrências já geradas é preservado). Mostra status
(Ativa/Pausada/Encerrada), próxima ocorrência, última ocorrência e
quantidade gerada.

### Tags (`/tags`, rota nova)
CRUD completo, associação/remoção em transações (via `TagMultiSelect`),
filtro de transações por tag, **prevenção de duplicidade** (constraint
`UNIQUE(user_id, name)` no banco + mensagem amigável no frontend).

### Centros de custo (`/centro-de-custos`)
CRUD completo, **ativar/desativar** (coluna `active`, migration `0035`,
já aplicada), filtros por status (Todos/Ativos/Inativos), associação a
transações, filtro de transações por centro de custo. Centros inativos só
somem do seletor de *novos* lançamentos — continuam resolvendo o nome em
lançamentos antigos.

### Anexos
`AttachmentsPanel` (já existia em Contas desde o Módulo 1) integrado ao
formulário de transação: upload, preview (abre via signed URL do Storage),
exclusão com confirmação. Visível só ao editar uma transação já existente.

### Dashboard
Reescrito para usar as views da Fase 3 (`v_transactions_enriched`,
`v_pending_by_due_date`, `v_category_summary` por tipo). KPIs: saldo atual,
receitas/despesas do período, resultado líquido, contas a pagar/receber,
despesas atrasadas, receitas pendentes. Navegação de período (mês anterior/
seguinte). Gráficos: barras (6 meses) e pizza por categoria (com abas
Despesas/Receitas).

### Transações
Criação, edição, **duplicação** (nasce sempre pendente, tags copiadas),
pagamento/recebimento, cancelamento, exclusão (soft delete) + restauração
(lixeira), busca textual, filtros (conta, categoria, centro de custo, forma
de pagamento, valor, tags, só-parceladas, só-recorrentes), ordenação,
paginação por offset.

---

## 8. Bugs corrigidos na Fase 3

| # | Bug | Causa | Correção |
|---|---|---|---|
| 1 | KPI "Na lixeira" de Recorrências sempre mostrava 0 fora da aba Lixeira | Query da contagem só rodava com a aba Lixeira ativa (`enabled: trashed`) | Query passou a rodar sempre, como já era feito em Contas |
| 2 | Botão "Remover anexo" fechava o diálogo inteiro de edição de transação em vez de pedir confirmação | Botões de `AttachmentsPanel` sem `type="button"` — dentro de um `<form>`, herdavam `type="submit"` do HTML e submetiam o formulário da transação | `type="button"` explícito adicionado aos dois botões do componente |
| 3 | Dashboard mostrava "Ago **De** 2026" | Classe CSS `capitalize` aplicada ao texto inteiro "{mês} de {ano}" capitalizava também a preposição | Classe removida (o nome do mês já vem capitalizado) |

---

## 9. Testes realizados

- **Financeiros:** cenários de saldo (receber, pagar, editar valor,
  cancelar, soft delete, restaurar, reativar, voltar para pendente),
  parcelamento (rateio sem perda de centavos), transferência entre contas —
  todos batendo com o valor esperado.
- **UI (navegador):** criar/editar/duplicar/pagar/cancelar/excluir/
  restaurar transação; CRUD completo de recorrências/tags/centros de custo;
  upload/exclusão de anexo; navegação de período no dashboard; busca e
  filtros.
- **Segurança/multiusuário:** ver seção 5 — dois usuários descartáveis,
  isolamento confirmado em leitura e escrita para tags, centros de custo,
  transações, recorrências e anexos.
- **Storage:** upload e exclusão de anexo testados via UI; policies de
  isolamento por pasta `{user_id}/...` confirmadas.
- **Dark mode:** testado nas telas novas (Tags, Centros de Custo,
  Recorrências, Dashboard) — sem contraste ruim encontrado.
- **Responsividade:** viewport mobile (375px) testado nas telas novas —
  sem overflow horizontal.
- **TypeScript:** 0 erros.
- **ESLint:** 0 erros, 4 warnings pré-existentes (não relacionados).
- **Build:** sucesso.
- **Dados de teste:** todos os usuários e registros descartáveis criados
  durante os testes foram removidos ao final de cada sessão — contagem
  zero confirmada no banco.

---

## 10. Documentação existente

- `docs/CONTEXTO_PROJETO.md` — documento de handoff técnico completo
  (arquitetura, banco, hooks/services/repositories, histórico de bugs e
  vulnerabilidades, auditoria de segurança seção 31, finalização da Fase 3
  seção 32).
- `docs/MODULO_3.md` — decisões técnicas específicas da Fase 3 (modelo de
  dados de transações, saldo, parcelamento, recorrências, views, hardening).
- `docs/HANDOFF_CONTINUIDADE.md` — **este arquivo**, ponto de entrada da
  próxima sessão.

---

## 11. Documentação ainda pendente

- `docs/ARQUITETURA.md`
- `docs/BANCO_DE_DADOS.md`
- `docs/REGRAS_DE_NEGOCIO.md`

Esses três documentos **não existem ainda**. Isso é uma pendência de
documentação — **não representa falha funcional da Fase 3**, que está
concluída independentemente disso.

---

## 12. Git / GitHub

- **Branch atual:** `develop`.
- **Commits locais:** `eb92bfa` (inicial) e `58936f2` (fecha Fase 3), mais
  o commit deste handoff (ver rodapé do relatório desta sessão).
- **Working tree:** limpo antes deste handoff.
- **Remote configurado:** **sim** — `origin` →
  `https://github.com/07Castiel/sistema-pessoal`.
- **Estado do remote (verificado via `git ls-remote origin`, somente
  leitura):** o remoto tem só **um commit**, na branch `main`, com o mesmo
  hash do commit local inicial (`eb92bfa`). Ou seja: **o commit `58936f2`
  (fechamento da Fase 3) ainda não foi enviado ao GitHub**, e a branch
  remota é `main`, não `develop` (a branch local usada até agora).
- **Push:** nenhum foi feito nesta sessão nem em nenhuma sessão anterior
  registrada nos documentos do projeto.

---

## 13. Deploy

- **Frontend:** **não publicado.** Nenhuma configuração de Vercel (`.vercel/`
  ou `vercel.json`) encontrada no repositório.
- **Backend/banco:** Supabase remoto **já existe e está em uso ativo**
  (project ref `xocehjrujmaxhwqhxelo`), com 35 migrations aplicadas — é o
  único componente já "em produção" hoje.
- **Se for configurar o deploy do frontend:** Vercel ainda precisa ser
  conectada ao repositório GitHub (que por sua vez ainda precisa receber o
  push do commit `58936f2`) — nenhum dos dois passos foi feito.

---

## PRÓXIMA SESSÃO

1. Ler `docs/HANDOFF_CONTINUIDADE.md` (este arquivo) por completo.
2. Ler `docs/CONTEXTO_PROJETO.md` por completo.
3. Ler `docs/MODULO_3.md` por completo.
4. Executar `git status`.
5. Executar `git log --oneline -10`.
6. Confirmar a branch atual (`git branch --show-current`).
7. Confirmar o remote (`git remote -v`) — lembrar que o remoto está
   desatualizado (só tem `eb92bfa`, em `main`) e que a branch local é
   `develop`.
8. **Não modificar código imediatamente.**
9. Apresentar um diagnóstico do estado atual ao usuário primeiro.
10. Só então iniciar a próxima tarefa, com escopo confirmado pelo usuário.

---

## 15. Fase 4

**Ainda não iniciada.** Antes de começar:

- revisar a arquitetura atual (`docs/CONTEXTO_PROJETO.md`, seção 3);
- revisar o banco (seção 4 deste documento e `docs/CONTEXTO_PROJETO.md`,
  seções 4-11);
- revisar os módulos já implementados vs. só com backend (seção 6 deste
  documento);
- revisar a documentação existente por completo;
- **definir o escopo com o usuário** — qual módulo entra primeiro
  (Cartões/Faturas, Investimentos, Empréstimos/Financiamentos, Metas ou
  Orçamento — todos com schema pronto, nenhum com UI);
- evitar duplicar funcionalidade já existente (ex.: não recriar lógica de
  saldo, não recriar padrão de soft delete/lixeira, reaproveitar
  `AttachmentsPanel`/`ConfirmDialog`/`KpiCard`/etc. já existentes).

---

## 16. Regras para futuras sessões

- Nunca alterar o banco sem antes verificar as migrations existentes
  (`list_migrations` do MCP do Supabase).
- Nunca recriar uma tabela que já existe.
- Nunca duplicar repository/service/hook já existente para a mesma
  entidade.
- Sempre reutilizar componentes compartilhados existentes
  (`src/components/shared/`) antes de criar um novo.
- Respeitar a arquitetura em camadas: `repository` → `service` → `hook` →
  `component`. Nenhuma tela chama `supabase` diretamente.
- Respeitar RLS — nunca desabilitar ou contornar.
- Não usar `SECURITY DEFINER` sem justificativa explícita e documentada.
- Validar ownership (não confiar só em RLS quando há referências entre
  tabelas — ver o caso de `validate_transaction_references`).
- Testar com dois usuários descartáveis sempre que houver isolamento de
  dados envolvido.
- Executar TypeScript (`npx tsc -b --noEmit`) após mudanças relevantes.
- Executar ESLint (`npm run lint`).
- Executar build (`npm run build`) antes de declarar qualquer fase
  concluída.
- Testar no navegador as funcionalidades críticas — não confiar só em
  compilação/type-check.
- Não declarar uma tarefa concluída apenas porque o código compila.
- Corrigir bugs reais encontrados durante os testes (não deixar para depois
  sem registrar).
- Não fazer commit ou push sem instrução explícita do usuário.
- Não alterar lógica financeira (saldo, delta, parcelamento) sem rodar os
  testes financeiros de regressão.

---

## 17. Comandos de diagnóstico

```bash
git status
git branch --show-current
git log --oneline -10
git remote -v
```

O `package.json` **não tem** um script `typecheck` dedicado — o type-check
roda embutido no `build`. Comandos reais disponíveis:

```bash
npx tsc -b --noEmit   # type-check isolado (mais rápido para iterar)
npm run lint          # eslint .
npm run build         # tsc -b && vite build (type-check + build de produção)
```

---

## 18. Alertas importantes

- Bundle de produção atualmente ~1,45 MB / 411 KB gzip — o aviso de "chunk
  grande" do Vite **não é bloqueante hoje**; code-splitting por rota é
  otimização futura.
- Os 4 warnings do ESLint são **pré-existentes** (arquivos gerados por
  `shadcn/ui`, categoria `react-refresh/only-export-components`) — não
  indicam regressão.
- **Não alterar a migration `0034` sem nova auditoria de segurança
  completa** (é o hardening de `EXECUTE` das 11 functions legadas).
- **Não revogar `EXECUTE` de `_transaction_balance_effect` para
  `authenticated`** — quebra toda inserção/edição/exclusão de transação
  (ver seção 5).
- **Não tocar na lógica de saldo** (`apply_transaction_balance`,
  `_transaction_balance_effect`, trigger `trg_transactions_balance`) sem
  rodar a bateria de testes financeiros de regressão antes e depois.
- **Não iniciar a Fase 4 automaticamente** — exige definição de escopo com
  o usuário primeiro (seção 15).
- O remote do GitHub está **desatualizado** (só tem o commit inicial, na
  branch `main`) — qualquer push precisa de instrução explícita do usuário,
  e é preciso decidir para qual branch remota (criar `develop` no remoto,
  ou mesclar para `main`) antes de empurrar.
