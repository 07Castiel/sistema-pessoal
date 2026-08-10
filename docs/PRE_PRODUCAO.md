# Pré-produção — Meu Financeiro

> **Sessão:** 2026-08-10, auditoria final de pré-produção (segurança,
> integridade financeira, banco, performance, frontend, qualidade e
> preparação para deploy no Vercel), executada sobre o estado 100%
> concluído da Fase 4 (commit `1ae86ed`). Este documento é o registro
> técnico dessa auditoria — não repita a investigação aqui descrita sem
> motivo novo; consulte antes de decidir se algo precisa de reanálise.

---

## 1. Escopo e método

Auditoria cobrindo: autenticação/sessão, isolamento multiusuário (RLS
testada empiricamente com usuários descartáveis, criados e removidos
nesta sessão), Storage, segredos, integridade financeira (funções e
triggers críticas comparadas byte-a-byte com o estado documentado),
schema de banco, performance (advisors + revisão de hooks), frontend/UX,
TypeScript/ESLint, e preparação para produção no Vercel (build, SPA
routing, variáveis de ambiente, configuração do Supabase Auth).

Todos os achados documentados nas sessões anteriores (`auth.uid()` não
otimizado, FKs sem índice, índices não usados, gap de ownership em
tabelas filhas) foram **reavaliados com evidência nova**, não assumidos
como válidos — ver seção 4.

---

## 2. Bugs reais encontrados e corrigidos

| # | Severidade | Problema | Evidência | Correção |
|---|---|---|---|---|
| 1 | **P0** | Build de produção gerava todos os assets sob `/financeiro-leonardo/assets/...` (`vite.config.ts` tinha `base: '/financeiro-leonardo/'` no build, convenção de GitHub Pages). No Vercel, a aplicação é servida na raiz do domínio — o `index.html` gerado referenciaria um caminho inexistente e a aplicação carregaria uma **tela em branco**, sem nenhum JS/CSS. Confirmado gerando o build antes/depois e inspecionando `dist/index.html`. | Nenhuma evidência de uso real de GitHub Pages (sem `.github/workflows`, sem `CNAME`, sem histórico de deploy) — configuração órfã. | `base` fixado em `'/'` incondicionalmente. Rebuild confirmado: `dist/index.html` agora referencia `/assets/...` e `/favicon.svg`. |
| 2 | **P0** | Não havia `vercel.json` nem qualquer configuração de rewrite — em produção estática, navegação direta para uma rota do React Router (ex.: `https://dominio/transacoes` digitado direto ou um refresh de página) retornaria 404 do host, já que não existe arquivo físico `transacoes.html`. | Comportamento padrão de hosts estáticos para SPA sem rewrite configurado. | Criado `vercel.json` com `rewrites` (`/(.*) → /index.html`) e `buildCommand`/`outputDirectory` explícitos. Testado localmente via `vite preview` (que aplica o mesmo fallback de SPA): navegação direta para `/transacoes` sem sessão carregou a SPA e redirecionou corretamente para `/login`, sem 404. |
| 3 | **P1** | 1.089 linhas órfãs em `audit_logs` (`user_id is null`) — resíduo de logins/logouts de usuários descartáveis criados em sessões de auditoria anteriores, cujo `user_id` virou `null` após o `DELETE` do usuário (FK `ON DELETE SET NULL`). Invisíveis a qualquer usuário via RLS (`user_id = auth.uid()` nunca compara igual a `null`), mas violava a regra explícita de não deixar dado de teste no banco. | `select count(*) from audit_logs where user_id is null` = 1089 antes da limpeza. | `DELETE FROM audit_logs WHERE user_id IS NULL` (DML, não é migration de schema). Restaram as 4 linhas legítimas dos 2 usuários reais. |
| 4 | **P2** (performance, correção segura e delimitada) | 66 policies de RLS (schemas `public` e `storage`) ainda usavam `auth.uid()` sem subquery, reavaliando a função a cada linha em vez de uma vez por query — achado do `get_advisors` (performance), já confirmado sem risco de segurança (é otimização pura, `auth.uid()` é `STABLE`). | `get_advisors(type=performance)` antes: 66 ocorrências de `auth_rls_initplan`. | Migration `0037_rls_auth_uid_performance_optimization`: reescreve `qual`/`with_check` de cada policy afetada trocando `auth.uid()` por `(select auth.uid())` via `ALTER POLICY` (preserva a policy, não recria). **Retestado**: `get_advisors` pós-migration não lista mais nenhuma ocorrência de `auth_rls_initplan`; teste multiusuário com 2 novos usuários descartáveis (`accounts`, `budgets`, `investments`) confirmou SELECT/UPDATE/DELETE cruzados continuam bloqueados (0 linhas) e acesso ao próprio dado continua funcionando (1 linha). |
| 5 | **P1** (estabilidade) | A aplicação não tinha nenhum `ErrorBoundary` — um erro de renderização não tratado em qualquer componente (React 19) resultaria em tela branca sem recuperação, sem mensagem ao usuário. | Busca por `ErrorBoundary` no código-fonte: nenhuma ocorrência. | Criado `src/components/shared/error-boundary.tsx` (class component padrão React) envolvendo toda a árvore em `App.tsx`. Tela de fallback com botão "Recarregar página", consistente com o padrão visual de `EmptyState`. Não altera nenhum fluxo do caminho feliz. |

Todas as correções foram testadas antes/depois e não alteraram nenhuma
regra de negócio, trigger financeira ou comportamento de RLS além da
otimização de performance (semântica idêntica, testada empiricamente).

---

## 3. Testes de segurança executados nesta sessão

Metodologia: usuários descartáveis criados via `auth.users` (raw SQL) +
`set local role authenticated` + `request.jwt.claims`, sempre removidos
ao final de cada rodada (confirmado `count = 0` depois).

| Ataque | Tabelas testadas | Resultado |
|---|---|---|
| SELECT cruzado | `accounts` | 0 linhas retornadas |
| UPDATE cruzado | `accounts`, `budgets` | 0 linhas afetadas |
| DELETE cruzado | `categories`, `investments` | 0 linhas afetadas |
| INSERT referenciando conta de outro usuário | `transactions` (`account_id`/`category_id` de outro usuário) | Bloqueado por `validate_transaction_references` (`SECURITY DEFINER`) com exceção explícita, antes mesmo de chegar à RLS |
| INSERT em tabela filha referenciando `goal_id` de outro usuário | `goal_contributions` | INSERT é aceito (RLS de `goal_contributions` só valida `user_id`, não o `goal_id` referenciado — gap conhecido e já documentado), mas `recalc_goal_amount` (`SECURITY INVOKER`) tenta atualizar a meta e é bloqueado pela RLS de `goals` — `current_amount` da meta da vítima **não muda**. Reconfirmado nesta sessão, mesmo comportamento das sessões anteriores. |
| Acesso próprio após a migration de otimização de RLS | `accounts`, `budgets`, `investments` | 1 linha cada — confirma que a otimização não quebrou o acesso legítimo |

**Nenhuma vulnerabilidade real foi encontrada.** O único gap conhecido
(INSERT em tabela filha referenciando entidade de outro usuário) está
contido pela combinação RLS + trigger `SECURITY INVOKER` na tabela pai,
sem impacto real — mesma conclusão de todas as sessões anteriores,
revalidada empiricamente nesta sessão em vez de presumida.

---

## 4. Achados reavaliados e mantidos como risco aceito (não corrigidos)

| Achado | Reavaliação nesta sessão | Decisão |
|---|---|---|
| 16 FKs sem índice cobrindo | `get_advisors(performance)` confirma a mesma contagem de antes — nenhuma mudança de schema alterou isso. Adicionar índice sem dado real de uso/volume é especulativo. | Mantido como pendência — decisão de indexação deve vir de dados reais de produção (volume, planos de query lentos), não de auditoria estática. |
| 18 índices não utilizados | Mesma contagem. Remover um índice "não usado" com 0 linhas de dado real na tabela não prova nada sobre o padrão de uso em produção. | Mantido — reavaliar depois de a aplicação ter uso real, com `pg_stat_user_indexes`. |
| `v_monthly_summary`/`v_category_summary` podem não excluir transações com `deleted_at` preenchido | Não alterado nesta sessão (é uma pergunta de regra de negócio — se uma transação excluída depois de já ter sido contabilizada num período fechado deve ou não desaparecer do relatório histórico — não determinável só pelo schema). | `[Requer confirmação]` — mantido, não presumido. |
| `profiles.theme`/`currency`/`language` sem sincronização real com `next-themes`/sem efeito no app | Decisão consciente e já documentada (Configurações usa `next-themes` diretamente); nada mudou. | Mantido como decisão de produto documentada, não bug. |
| `useLocalStorage("last-account-id")` não escopado por usuário, não limpo no logout | Não tocado (fora do escopo de qualquer módulo alterado nesta sessão; baixo impacto real — só afeta múltiplos usuários no mesmo navegador). | Mantido como pendência de baixo impacto. |
| Bundle de produção ~1,63 MB / ~445 KB gzip, chunk único acima do limite recomendado pelo Vite | Confirmado no build desta sessão. Code-splitting por rota (`React.lazy`) resolveria, mas é uma mudança que toca `App.tsx` inteiro e exige reteste de loading/transição em todas as 18 rotas — não é uma correção "clara e delimitada" o suficiente para aplicar sem necessidade comprovada (a aplicação não demonstrou lentidão real). | **P3, não implementado** — candidato a uma sessão dedicada de otimização, não a esta auditoria de correção. |
| `auth_leaked_password_protection` desabilitado (Supabase Auth) | Confirmado via `get_advisors(security)`, único WARN ativo. É uma configuração do serviço de Auth (dashboard/Management API), não uma tabela SQL — não há caminho de correção via migration. | **Ação manual necessária** — ver seção 6. |

---

## 5. Estado do banco após esta sessão

- **Migrations aplicadas nesta sessão:** `0037_rls_auth_uid_performance_optimization` (aditiva, reescreve `qual`/`with_check` de policies existentes via `ALTER POLICY`; nenhuma tabela, function ou trigger criada/removida).
- **Nenhuma função ou trigger financeira foi alterada.** `_transaction_balance_effect`, `apply_transaction_balance`, `apply_transfer_balance`, `apply_investment_movement`, `recalc_goal_amount`, `check_goal_completion`, `recalc_invoice_total`, `recalc_loan_balance`, `recalc_financing_balance`, `validate_transaction_references`, `validate_transaction_status`, `check_budget_alerts` foram lidas via `pg_get_functiondef` e conferidas **idênticas**, ao caractere, ao texto já documentado em `docs/BANCO_DE_DADOS.md` — nenhuma alteração desde a Fase 4.
- **Dados removidos:** 1.089 linhas órfãs de `audit_logs` (`user_id is null`, resíduo de testes de sessões anteriores) + todos os dados de teste criados e removidos dentro desta própria sessão (4 usuários descartáveis, contas, categorias, metas, orçamentos, investimentos, transações — todos confirmados removidos, contagem final = 0 em todas as tabelas transacionais, exceto os dados reais dos 2 usuários do produto).
- **Estado final confirmado:** 2 usuários reais em `auth.users`, `accounts` = 3 (1 + 2, dos dois usuários reais), `categories` = 32 (16 padrão × 2 usuários), todas as demais tabelas de domínio com 0 linhas (sem uso real do produto ainda) ou só dados dos usuários reais, `audit_logs` = 4 (login/logout reais).
- **RLS:** 100% das tabelas de domínio com RLS habilitada, todas as policies revisadas nesta sessão (dump completo de `pg_policies`), todas seguindo o padrão `user_id = (select auth.uid())` sem exceção permissiva.

---

## 6. Preparação para Vercel

### Build

```bash
npm install
npm run build
```

Gera `dist/` (Vite). Comando de build já testado em ambiente limpo
nesta sessão (`npm run build` com `tsc -b && vite build`), 0 erros.

### `vercel.json` (criado nesta sessão)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

O `rewrites` garante que qualquer rota do React Router (`/transacoes`,
`/cartoes`, etc.) funcione em acesso direto/refresh — sem ele, o Vercel
retornaria 404 para qualquer URL que não seja `/`. Confirmado localmente
via `vite preview` (mesmo mecanismo de fallback SPA): navegação direta
para uma rota protegida sem sessão carregou a aplicação e redirecionou
para `/login` corretamente, sem 404.

### Variáveis de ambiente necessárias no Vercel

| Variável | Valor | Onde encontrar |
|---|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (`https://xocehjrujmaxhwqhxelo.supabase.co`) | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon/publishable) | Supabase Dashboard → Project Settings → API — **nunca** a `service_role` |

Confirmado que `.env.example` já lista exatamente essas duas variáveis,
sem nenhum valor real (arquivo seguro para versionar). `.env` real
nunca foi versionado (confirmado via `git ls-files` e `git log --all
-- .env`, sem nenhuma ocorrência no histórico).

### Configuração necessária no Supabase (manual, fora do alcance desta sessão)

1. **Authentication → URL Configuration**: adicionar a URL de produção
   do Vercel (ex.: `https://<projeto>.vercel.app` e/ou domínio
   customizado) tanto em **Site URL** quanto em **Redirect URLs**. Sem
   isso, `resetPasswordForEmail` (usa `${window.location.origin}/redefinir-senha`
   dinamicamente) vai gerar um link de recuperação de senha que o
   Supabase rejeita por não estar na lista de redirects permitidos.
2. **Authentication → Providers → Email → Password strength**: habilitar
   **Leaked Password Protection** (achado `auth_leaked_password_protection`
   do advisor de segurança — não corrigível via SQL/migration).
3. Confirmar que o bucket `attachments` (privado, já configurado)
   continua privado — nenhuma ação necessária, só confirmação visual no
   dashboard antes de ir ao ar.

### O que já está pronto

- Build de produção funcional e testado (`npm run build` + `vite
  preview`, fluxo completo: cadastro → login → criar transação → saldo
  atualizado → Dashboard e Relatórios consistentes, sem erro de console).
- `vercel.json` com SPA rewrite.
- `base` do Vite corrigido para `/`.
- `.env.example` correto e sem segredos.
- RLS otimizada e revalidada.
- `ErrorBoundary` global para evitar tela branca em erro não tratado.

### O que falta ser feito manualmente (fora do alcance de um agente)

- Criar/conectar o projeto Vercel de fato (nenhum projeto Vercel foi
  encontrado nesta sessão via API na conta conectada — o commit
  histórico `cb22baa "chore: trigger Vercel deployment"` sugere uma
  tentativa anterior, mas não há projeto ativo visível agora).
- Configurar as variáveis de ambiente no dashboard do Vercel.
- Configurar Site URL / Redirect URLs no Supabase Auth (item 1 acima).
- Habilitar Leaked Password Protection no Supabase Auth (item 2 acima).
- Validar o primeiro deploy real (build no Vercel, não só local).

---

## 7. Checklist final de produção

- [x] Auditoria de segurança completa (Auth, RLS, Storage, segredos)
- [x] RLS testada empiricamente (multiusuário, antes e depois da migration 0037)
- [x] Storage revisado (bucket privado, policy por pasta de usuário, upload confere com o padrão)
- [x] Integridade financeira validada (funções/triggers críticas conferidas idênticas ao documentado)
- [x] Dashboard/Relatórios/Contas consistentes (cenário real testado: R$1.000,00 idêntico nas duas telas)
- [x] TypeScript — 0 erros
- [x] ESLint — 0 erros (mesmos 4 warnings pré-existentes)
- [x] Build de produção funcionando
- [x] Nenhum segredo versionado (`.env` nunca commitado, `.env.example` limpo)
- [x] SPA routing preparado para Vercel (`vercel.json`)
- [x] Variáveis de produção identificadas e documentadas
- [x] Bugs P0/P1/P2 corrigidos (5 encontrados, 5 corrigidos)
- [x] Regressão executada após as correções (TypeScript/ESLint/build + multiusuário + fluxo financeiro completo)
- [x] Dados de teste removidos (inclusive resíduo de sessões anteriores)
- [x] Documentação atualizada
- [ ] Projeto Vercel criado/conectado e variáveis configuradas — **ação manual do usuário**
- [ ] Site URL / Redirect URLs configurados no Supabase Auth — **ação manual do usuário**
- [ ] Leaked Password Protection habilitado — **ação manual do usuário**
- [ ] Primeiro deploy real validado no Vercel — **ação manual do usuário**
