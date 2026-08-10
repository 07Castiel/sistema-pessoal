# Arquitetura — Meu Financeiro

> Documento técnico derivado do código real do projeto em `develop`
> (commit `216e2b4`), de `package.json` e dos documentos de handoff
> existentes (`docs/HANDOFF_CONTINUIDADE.md`, `docs/CONTEXTO_PROJETO.md`,
> `docs/MODULO_3.md`). Escrito para que qualquer sessão futura do Claude
> Code (ou outro engenheiro) entenda o sistema sem precisar reler todo o
> código-fonte. Onde uma informação não pôde ser confirmada diretamente,
> está marcada como **"Não documentado / requer confirmação."**

---

## 1. Visão geral do sistema

**Meu Financeiro** é um aplicativo de gestão financeira pessoal. A Fase 4
está **100% concluída**: além do núcleo da Fase 3 (contas, categorias,
transações, recorrências, tags, centros de custo, dashboard), o sistema
cobre também cartões/faturas, metas, investimentos, empréstimos/
financiamentos, orçamento, relatórios, configurações e um calendário
financeiro — todos com UI completa e testada. **Não existe mais nenhuma
tela `ComingSoon`.**

É uma aplicação **client-only**: não existe backend próprio (Node/API).
O frontend React fala diretamente com o Supabase (Postgres + Auth +
Storage) via `supabase-js`, sempre por trás da camada `repository`.

## 2. Stack

| Camada | Tecnologia | Versão (`package.json`) |
|---|---|---|
| Build | Vite | `^8.2.0` |
| Framework | React + TypeScript (`strict`) | React `^19.2.8`, TS `~6.0.2` |
| Roteamento | React Router | `^7.18.2` |
| Estilo | TailwindCSS v4 + shadcn/ui ("new-york", Radix via `radix-ui`) | Tailwind `^4.3.3`, `radix-ui ^1.6.7` |
| Estado de servidor | TanStack Query | `^5.101.4` (+ devtools) |
| Formulários | React Hook Form + Zod (`@hookform/resolvers`) | RHF `^7.84.0`, Zod `^3.25.76` |
| Drag-and-drop | `@dnd-kit` (core, sortable, utilities) | `^6.3.1` / `^10.0.0` / `^3.2.2` |
| Gráficos | Recharts | `^3.10.1` |
| Ícones | lucide-react | `^1.30.0` |
| Toasts | sonner | `^2.0.7` |
| Datas | date-fns, react-day-picker | `^4.4.0`, `^10.0.1` |
| Backend | Supabase (`@supabase/supabase-js`) — Postgres 17.6, Auth, Storage | `^2.112.2` |
| Lint/format | ESLint (flat config) + Prettier | ESLint `^10.8.0` |

Scripts reais (`package.json`):

```bash
npm run dev      # vite
npm run build    # tsc -b && vite build   (type-check embutido)
npm run lint     # eslint .
npm run format   # prettier --write .
```

Não existe script `typecheck` dedicado — para checar tipos isoladamente
sem rodar o build completo, use `npx tsc -b --noEmit`.

## 3. Estrutura de diretórios

```
src/
  components/
    ui/            componentes shadcn/ui gerados — não editar manualmente
    layout/        Sidebar, Header, MobileSidebar, NotificationsBell, GlobalSearch, UserMenu, ThemeToggle
    shared/        genéricos reutilizáveis entre módulos (seção 16)
    auth/          ProtectedRoute, GuestRoute
    accounts/ categories/ transactions/ recurring/ tags/ cost-centers/
                   componentes exclusivos de cada módulo
  pages/           uma pasta por rota — todos os módulos com UI completa (nenhum ComingSoon, seção 20)
  layouts/         AppLayout (autenticado), AuthLayout
  hooks/           um hook por necessidade de dados/UI (TanStack Query)
  services/        camada fina entre hooks e repositories
  repositories/     único ponto de chamada ao Supabase por entidade
  schemas/         validação Zod, um arquivo por formulário
  types/           database.types.ts (gerado pelo Supabase) + index.ts (aliases de domínio)
  constants/       nav.ts, colors.ts, icon-registry.ts
  contexts/        auth-context.tsx + auth-context-value.ts (separado por causa do Fast Refresh)
  providers/       ThemeProvider (next-themes), QueryProvider (TanStack Query)
  lib/             supabase.ts (client), format.ts, errors.ts, utils.ts (cn), category-tree.ts
docs/              este arquivo + BANCO_DE_DADOS.md, REGRAS_DE_NEGOCIO.md, CONTEXTO_PROJETO.md, MODULO_3.md, HANDOFF_CONTINUIDADE.md
```

Não existe pasta `supabase/` no repositório — as migrations do banco são
aplicadas remotamente via MCP do Supabase (`apply_migration`), não
versionadas localmente como arquivos SQL.

## 4. Arquitetura em camadas

```
repository → service → hook → component/page
```

Regra obrigatória, seguida em 100% dos módulos implementados: **nenhuma
tela ou componente chama `supabase` diretamente.** Toda chamada ao
Supabase (tabela, view, RPC ou Storage) vive num arquivo
`*.repository.ts`.

Fluxo típico de uma mutação, usando Transações como exemplo real
([`src/hooks/use-transactions.ts`](../src/hooks/use-transactions.ts)):

```
TransactionFormDialog (component)
  → useCreateTransaction() (hook, TanStack useMutation)
    → transactionsService.create() (service, decide simples/parcelado/recorrente)
      → transactionsRepository.create() (repository, insert + select no supabase-js)
```

## 5. Responsabilidade de cada camada

- **`repository`** — único lugar que importa `supabase` de
  [`src/lib/supabase.ts`](../src/lib/supabase.ts). Monta queries
  (`select`/`insert`/`update`/`.rpc(...)`/Storage), lança o erro do
  Postgres/PostgREST sem tratá-lo (`if (error) throw error`). Não conhece
  React nem cache.
- **`service`** — camada fina entre `repository` e `hook`. Na maioria dos
  módulos é passthrough puro (reexporta métodos do repository), criada
  para não violar a arquitetura em camadas e servir de ponto de extensão
  futuro. Um caso tem lógica real hoje:
  [`transactions.service.ts`](../src/services/transactions.service.ts) —
  `create()` decide entre lançamento simples, parcelamento (RPC) ou
  criação de regra de recorrência, com base em `values.repeat`.
- **`hook`** — usa TanStack Query (`useQuery`/`useMutation`). Define
  `queryKey`, `staleTime` implícito (30s global, ver seção 8), invalidação
  de cache no `onSuccess`, e dispara toasts (`sonner`) de sucesso/erro via
  `getErrorMessage()`.
- **`component`/`page`** — só chama hooks e renderiza. Estado de UI local
  (filtros, abertura de dialog) fica em `useState` na própria página.

## 6. Fluxo de dados

Leitura: `page` chama um hook de `useQuery` → `service` → `repository` →
Supabase (tabela ou view) → cache do TanStack Query → render.

Escrita: `component` (geralmente um formulário) chama um hook de
`useMutation` → `service` → `repository` → Supabase → `onSuccess` invalida
as `queryKey`s afetadas → todo componente inscrito nessas chaves
re-renderiza com dado fresco automaticamente. Não há gerenciamento manual
de estado global de domínio (Redux/Zustand) — o cache do TanStack Query
**é** o estado de servidor.

## 7. Gerenciamento de estado

- **Estado de servidor:** 100% TanStack Query. Nenhum Redux/Zustand no
  projeto.
- **Estado de UI local:** `useState`/`useCallback` na própria página
  (filtros, qual dialog está aberto, item selecionado para
  ação/confirmação).
- **Estado de formulário:** React Hook Form, isolado por diálogo.
- **Persistência leve no cliente:** `useLocalStorage` (hook genérico,
  [`src/hooks/use-local-storage.ts`](../src/hooks/use-local-storage.ts)) —
  usado por exemplo para lembrar a última conta usada no formulário de
  transação (`last-account-id`, ver
  [`transaction-form-dialog.tsx`](../src/components/transactions/transaction-form-dialog.tsx)).

## 8. TanStack Query

Configuração global em
[`src/providers/query-provider.tsx`](../src/providers/query-provider.tsx):

```ts
staleTime: 30 * 1000,
refetchOnWindowFocus: false,
retry: 1,
```

React Query Devtools montado apenas em `import.meta.env.DEV`.

**Convenção de `queryKey`:** array com uma string constante de módulo
(`KEY = "transactions"`) seguida de operação e parâmetros relevantes —
ex.: `["transactions", "list", userId, filters]`. Listas paginadas usam
`placeholderData: keepPreviousData` para não piscar a tela ao trocar de
página/filtro.

**Convenção de invalidação:** cada módulo com efeito colateral em outro
domínio centraliza a invalidação numa função `useInvalidate<Modulo>()`
dentro do próprio arquivo de hooks, chamada em todo `onSuccess` de
mutação. Exemplo real
([`use-transactions.ts`](../src/hooks/use-transactions.ts)):

```ts
function useInvalidateTransactions() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
    queryClient.invalidateQueries({ queryKey: ["accounts"] })   // saldo
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["recurring-rules"] })
  }
}
```

Isso é deliberado: qualquer mutação de transação invalida sempre as
quatro superfícies afetadas de uma vez, para nunca esquecer uma. Ao criar
uma nova mutação num módulo existente, siga o mesmo padrão em vez de
invalidar manualmente chave por chave no componente.

## 9. React Hook Form + Zod

Um schema Zod por formulário em `src/schemas/` (`transaction.schema.ts`,
`account.schema.ts`, `category.schema.ts`, `cost-center.schema.ts`,
`recurring-rule.schema.ts`, `tag.schema.ts`, `auth.schema.ts`), consumido
via `zodResolver`. Validações condicionais usam `.superRefine()` — exemplo
real em
[`transaction.schema.ts`](../src/schemas/transaction.schema.ts): exige
`installments` quando `repeat === "installments"`, exige `frequency`
quando `repeat === "recurring"`, valida que `due_date`/`end_date` não
sejam anteriores a `date`, e bloqueia `settled: true` quando
`repeat !== "none"` (parcelas e recorrências nascem sempre pendentes).

Padrão de formulário:

```tsx
const form = useForm<TransactionFormValues>({
  resolver: zodResolver(transactionSchema),
  defaultValues: buildDefaults(...),
  mode: "onBlur",
  reValidateMode: "onChange",
})
```

Uma função `buildDefaults(...)` pura (fora do componente) monta os
valores iniciais a partir de: nada (criação), uma entidade existente
(edição) ou outra entidade (duplicação — ver
`transaction-form-dialog.tsx`, que reseta `date`/`status` ao duplicar).

## 10. Supabase

Client único em [`src/lib/supabase.ts`](../src/lib/supabase.ts):

```ts
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
```

Tipado com `Database` gerado por `generate_typescript_types` do MCP do
Supabase (`src/types/database.types.ts`, 2160 linhas — não editar à mão,
regenerar após qualquer migration). Variáveis de ambiente exigidas:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (o client lança erro
no boot se ausentes). `.env` não versionado; só `.env.example` (vazio)
está no git.

## 11. Autenticação

Supabase Auth (e-mail/senha). `AuthProvider`
([`src/contexts/auth-context.tsx`](../src/contexts/auth-context.tsx))
mantém `user`, `session`, `profile` (linha de `profiles`) e `loading`,
escutando `supabase.auth.onAuthStateChange`. Login e logout disparam
auditoria (`auditService.logLogin`/`logLogout`, sem bloquear o fluxo —
`.catch(() => {})`). Rotas divididas por `ProtectedRoute`
(redireciona para `/login` se `!user`) e `GuestRoute` (o inverso, para
`/login`, `/registrar`, `/esqueci-senha`). `/redefinir-senha` fica fora
de ambos.

Fluxos implementados: login, cadastro, recuperação de senha, redefinição
de senha. **Não implementado:** login social/OAuth (não documentado no
código — se necessário, requer confirmação de escopo).

## 12. RLS

Toda leitura/escrita do frontend passa pela `anon`/`authenticated` key
pública, nunca a `service_role`. A segurança de isolamento entre usuários
é inteiramente responsabilidade do RLS no banco (ver
[`BANCO_DE_DADOS.md`](./BANCO_DE_DADOS.md), seções 11-12) — o frontend
nunca filtra por `user_id` "por segurança", só por necessidade de query;
mesmo que um filtro fosse esquecido, o RLS impediria vazamento entre
usuários. Uma trigger adicional (`validate_transaction_references`)
cobre um caso que RLS sozinho não cobre: ownership de referências entre
tabelas (ver seção 24).

## 13. Storage

Bucket único `attachments` (privado). Camada:
[`attachments.repository.ts`](../src/repositories/attachments.repository.ts).
Upload grava em `{userId}/{entityType}/{entityId}/{uuid}.{ext}`, insere a
linha em `attachments` e, se o insert falhar, remove o arquivo já
enviado do Storage (evita órfão). Leitura usa signed URL de 300s
(`createSignedUrl`), nunca URL pública. `entity_type` é uma union type
local (`AttachmentEntityType`), não um enum do banco — hoje usada por
Contas e Transações; os demais valores (`card_invoice`, `loan`,
`financing`, `goal`, `recurring_rule`, `investment`) existem no tipo mas
**não têm UI que os produza ainda**.

## 14. Soft delete

Toda entidade principal com histórico relevante tem coluna
`deleted_at timestamptz`. Nunca é feito `DELETE` desses dados — sempre
`UPDATE deleted_at = now()` (exclusão) / `UPDATE deleted_at = null`
(restauração), com uma aba/tela de "Lixeira" por módulo. Confirmado nos
repositories de `accounts`, `categories`, `transactions`,
`recurring_rules`. **Exceção deliberada:** `tags` e `cost_centers` usam
`DELETE` físico direto (`tagsRepository.remove`,
`costCentersRepository.remove`) — não têm coluna `deleted_at`; são
seguros porque as FKs de `transactions`/`recurring_rules` para elas são
`ON DELETE SET NULL` (não deixam referência quebrada). `cost_centers`
usa em vez disso um flag `active` (migration `0035`) para "desativar sem
apagar" — ver seção 9 de
[`BANCO_DE_DADOS.md`](./BANCO_DE_DADOS.md).

## 15. Padrões de formulários

**Padrão `key={formKey}`:** todo diálogo de criar/editar recebe do pai
uma prop `key` ligada a um contador (`formKey`) incrementado a cada
abertura (`setFormKey(k => k + 1)` antes de `setFormOpen(true)`). Isso
força o React a desmontar/remontar o formulário inteiro, garantindo que
`defaultValues` sejam recalculados do zero. Existe porque, historicamente
(Módulo 1), resetar via `useEffect` deixava estado antigo vazar entre
aberturas consecutivas — bug real documentado em
`CONTEXTO_PROJETO.md`. Confirmado em
[`accounts.tsx`](../src/pages/accounts/accounts.tsx) e
[`transactions.tsx`](../src/pages/transactions/transactions.tsx). **Use
este padrão em qualquer novo diálogo de formulário.**

**Campo de moeda:** `CurrencyInput`
([`src/components/shared/currency-input.tsx`](../src/components/shared/currency-input.tsx))
trabalha em centavos internamente e sincroniza `e.target.value` no
próprio handler do evento, não só via `useState`, para não acumular
dígitos sob digitação rápida (bug real do Módulo 1, corrigido).

**Seção avançada expansível:** formulários com muitos campos opcionais
(ex.: `TransactionFormDialog`) colapsam os campos secundários atrás de um
botão "Campos avançados" (`useState` local, sem componente
`Accordion` do shadcn — implementação manual com `ChevronDown` rotativo).

**Botões dentro de formulário:** qualquer `<button>` que não deva
submeter o form precisa de `type="button"` explícito — bug real
encontrado quando `AttachmentsPanel` (que não tinha) passou a ser
renderizado dentro do `<form>` de transação e o botão "Remover anexo"
submetia o formulário inteiro. **Revisar isso ao reutilizar qualquer
componente `shared/` dentro de um novo `<form>`.**

## 16. Padrões de dialogs

- **Confirmação:** `ConfirmDialog`
  ([`src/components/shared/confirm-dialog.tsx`](../src/components/shared/confirm-dialog.tsx))
  — genérico, usado para toda exclusão/cancelamento. Props: `title`,
  `description`, `confirmLabel`, `destructive` (estiliza o botão de
  confirmação como `destructive`), `loading` (desabilita botões e mostra
  spinner durante a mutação).
- **Formulário:** `Dialog`/`DialogContent` do shadcn, com
  `max-h-[90vh] overflow-y-auto` para não estourar a viewport em telas
  pequenas.
- **Painel lateral:** `Sheet` (ex.: `AccountHistorySheet`) para conteúdo
  mais extenso que não é um formulário de edição.

## 17. Padrões de tabelas/listagens

- **Paginação:** `PaginationBar`
  ([`src/components/shared/pagination-bar.tsx`](../src/components/shared/pagination-bar.tsx))
  — offset com contagem exata (`count: "exact"` no `select` do
  supabase-js), não cursor. Decisão registrada em `MODULO_3.md`: o
  requisito de produto é mostrar "página X de Y" e o total, incompatível
  com cursor puro.
- **Estado vazio:** `EmptyState`
  ([`src/components/shared/empty-state.tsx`](../src/components/shared/empty-state.tsx))
  — variantes conforme o motivo (lixeira vazia, busca sem resultado, lista
  realmente vazia com CTA de criação).
- **Busca com debounce:** `useDebounce` (300ms) aplicado ao termo antes de
  entrar na `queryKey`, para não disparar uma query por tecla.
- **Filtros combinados:** um objeto de filtros único em `useState` na
  página (`TransactionListFilters`, `AccountListFilters`), atualizado por
  merge parcial (`patchFilters`), resetando `page` para `1` a cada
  mudança de filtro.
- **KPIs no topo da página:** `KpiCard`
  ([`src/components/shared/kpi-card.tsx`](../src/components/shared/kpi-card.tsx)),
  com estado de `loading` próprio, usado em Transações, Contas e
  Dashboard.

## 18. Tratamento de erros

Toda mutação captura erro do Supabase/Postgres e passa por
`getErrorMessage()`
([`src/lib/errors.ts`](../src/lib/errors.ts)), que:

1. Se a mensagem contém `"duplicate key value"`, procura o nome da
   constraint num mapa (`CONSTRAINT_MESSAGES`) e devolve uma mensagem
   amigável em português; se a constraint não estiver mapeada, devolve
   um genérico ("Já existe um registro com esses dados.").
2. Caso contrário, repassa a mensagem original — regras de negócio
   levantadas no banco via `raise exception` já vêm em português, então
   passam direto.

Toasts (`sonner`) padronizados: sucesso com mensagem específica da ação
(ex.: `"Receita marcada como recebida"`), erro com título genérico da
operação + `description: getErrorMessage(error)`. **Ao mapear uma nova
constraint UNIQUE do banco, adicione a entrada em `CONSTRAINT_MESSAGES`
em vez de deixar o usuário ver a mensagem crua do Postgres.**

Erros de **renderização** (não de mutação/query) são cobertos por um
`ErrorBoundary` global
([`src/components/shared/error-boundary.tsx`](../src/components/shared/error-boundary.tsx)),
adicionado na auditoria de pré-produção e envolvendo toda a árvore em
`App.tsx`. Sem ele, um erro não tratado em qualquer componente resultava
em tela branca sem recuperação — o boundary mostra uma tela de fallback
com botão "Recarregar página" e loga o erro via `console.error`.

## 19. Convenções de nomenclatura

- Arquivos: `kebab-case.ts(x)`, sufixo por camada
  (`*.repository.ts`, `*.service.ts`, `use-*.ts` para hooks,
  `*.schema.ts`).
- Componentes: `PascalCase` exportado nomeado (não `default`), exceto
  páginas (`export default function XPage()`).
- Rotas: em português, com acento quando aplicável (`/transacoes`,
  `/centro-de-custos`, `/recorrencias`) — ver
  [`src/App.tsx`](../src/App.tsx).
- Hooks de mutação: `use<Verbo><Entidade>` (`useCreateTransaction`,
  `useSoftDeleteAccount`, `useSetTransactionStatus`).
- Hooks de leitura: `use<Entidade>Query`/`use<Entidade>s`
  (`useTransactionsQuery`, `useAccounts`).
- `queryKey` raiz: string curta do módulo em inglês
  (`"transactions"`, `"accounts"`, `"cost-centers"`, `"recurring-rules"`).

## 20. Regras para novas funcionalidades

- Seguir sempre `repository → service → hook → component/page`; nenhuma
  tela chama `supabase` diretamente.
- Antes de criar uma tabela/coluna nova, checar se já existe schema
  pronto (ver [`BANCO_DE_DADOS.md`](./BANCO_DE_DADOS.md)) — todos os
  módulos "BACKEND EXISTENTE" da Fase 4 (Cartões/Faturas, Metas,
  Investimentos, Empréstimos/Financiamentos, Orçamento, Relatórios,
  Configurações e Calendário, ver `docs/MODULO_4.md`) já ganharam UI
  completa e não são mais `ComingSoon`. Use `src/pages/cards/`
  (integração com transações, mais complexo), `src/pages/goals/`/
  `src/pages/investments/` (módulos isolados, mais simples),
  `src/pages/loans/` (dois modelos de dados na mesma página, via abas)
  ou `src/pages/calendar/` (agregação de múltiplas fontes sem tabela
  própria) como referência de como transformar um módulo "BACKEND
  EXISTENTE" em UI completa para qualquer fase futura.
- Reaproveitar componentes de `src/components/shared/` antes de criar um
  novo (seção 16 do `CONTEXTO_PROJETO.md` lista todos).
- Nunca duplicar lógica de saldo — ela já existe no banco (trigger
  `trg_transactions_balance` + `apply_transaction_balance` +
  `_transaction_balance_effect`, ver `BANCO_DE_DADOS.md` seção 19).
- Nunca alterar RLS ou revogar/conceder `EXECUTE` sem antes ler a seção
  de segurança de `BANCO_DE_DADOS.md` — em particular a exceção de
  `_transaction_balance_effect`.
- Toda mutação nova precisa invalidar as `queryKey`s corretas — siga o
  padrão `useInvalidate<Modulo>()` da seção 8.
- Todo `<button>` dentro de um componente que pode acabar renderizado
  dentro de um `<form>` precisa de `type="button"` explícito.

## 21. Padrões de testes

**Não há suíte de testes automatizados no repositório** (sem
`vitest`/`jest`/`playwright` em `package.json`, sem pasta `__tests__` ou
arquivos `*.test.ts`/`*.spec.ts` encontrados). A validação até a Fase 3
foi manual: TypeScript (`tsc -b`), ESLint, build de produção, e testes
funcionais/financeiros/segurança executados manualmente no navegador e
via SQL direto no banco (usuários descartáveis), documentados em
`CONTEXTO_PROJETO.md` seções 21-22 e 31.6. **Se testes automatizados
forem introduzidos no futuro, este documento deve ser atualizado.**

## 22. Considerações de performance

- Bundle de produção em um único chunk, ~1,45 MB / 411 KB gzip (medido na
  Fase 3) — aviso de "chunk grande" do Vite, não bloqueante hoje;
  code-splitting por rota é otimização futura registrada, não feita.
- Paginação por offset (seção 17) é aceitável para o volume esperado de
  um app pessoal; caminho de migração para keyset documentado em
  `MODULO_3.md` se o volume crescer.
- Índices GIN trigram (`pg_trgm`, schema `extensions`) sustentam busca
  `ILIKE` em `description`/`supplier`/`notes` de `transactions` sem
  table scan.
- Consultas de contagem em lote (`countUsageBatch` em `tags`,
  `cost_centers`) evitam N+1 ao listar itens com contador de uso —
  padrão a seguir para qualquer nova lista com contador por item.
- `staleTime: 30s` global evita refetch redundante entre navegações
  próximas no tempo.

## 23. Segurança

Cobertura detalhada em [`BANCO_DE_DADOS.md`](./BANCO_DE_DADOS.md), seções
11-12 e "Segurança das functions". Pontos que também tocam o frontend:

- O client Supabase usa sempre a chave pública (`anon`/publishable), nunca
  `service_role` — confirmado em `src/lib/supabase.ts`; não há nenhum
  código server-side no repositório.
- Nenhuma lógica de autorização é replicada no frontend "por segurança" —
  o frontend pode até deixar de filtrar algo, mas RLS é quem
  efetivamente impede vazamento entre usuários. Filtros do frontend
  (`.eq("user_id", userId)`) existem por necessidade de query, não como
  linha de defesa.
- Mensagens de erro do banco (`raise exception`) já são pensadas para
  serem exibidas ao usuário final — não vazam detalhes de schema.
- Anexos: sempre signed URL de curta duração (300s), nunca URL pública
  direta.

## 24. Dependências críticas entre módulos

- **Transações → Contas:** toda transação com `account_id` afeta o saldo
  da conta via trigger no banco (não há código no frontend que calcule
  saldo — ele sempre vem de `accounts.current_balance`, já atualizado).
  Por isso `useInvalidateTransactions()` sempre invalida `["accounts"]`.
- **Transações → Categorias/Contas/Centros de custo/Cartões:** a trigger
  `validate_transaction_references` (banco) garante que essas referências
  pertencem ao mesmo usuário — o frontend espelha a regra de
  compatibilidade categoria×tipo em `useTransactionLookups` só para não
  mostrar opções inválidas na UI, mas a garantia real é do banco.
- **Transações → Recorrências:** criar uma transação com `repeat:
  "recurring"` cria uma `recurring_rules` e chama
  `generateDue()` imediatamente (materializa a primeira ocorrência
  vencida). Editar uma recorrência não mexe em transações já geradas.
- **Transações → Tags:** M:N via `transaction_tags`, gerenciada por
  `replaceTags()` (delete-then-insert) dentro do próprio
  `transactions.repository.ts` — não existe um `transaction-tags.repository.ts`
  separado.
- **Dashboard → Views:** o dashboard nunca lê `transactions` diretamente;
  sempre lê `v_transactions_enriched`, `v_monthly_summary`,
  `v_category_summary`, `v_net_worth`, `v_pending_by_due_date`. Qualquer
  coluna nova em `transactions` que deva aparecer no dashboard precisa
  ser adicionada primeiro na view correspondente (banco), não só no
  frontend.
- **Anexos → qualquer entidade:** `attachments` é polimórfica
  (`entity_type` + `entity_id`); adicionar anexos a um novo módulo não
  exige mudança de schema, só passar o `entityType` correto (union type
  em `attachments.repository.ts`) e renderizar `AttachmentsPanel`.
