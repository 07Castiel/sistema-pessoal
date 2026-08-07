# Meu Financeiro

Sistema completo de gestão financeira pessoal — controle de contas, receitas, despesas, cartões de crédito, investimentos, empréstimos, metas, orçamento e muito mais.

## Stack

- React 19 + TypeScript + Vite
- TailwindCSS v4 + shadcn/ui (Radix)
- Supabase (PostgreSQL, Auth, RLS)
- React Router, TanStack Query, React Hook Form + Zod
- Recharts, Lucide Icons

## Desenvolvimento

```bash
npm install
npm run dev
```

Crie um arquivo `.env` com base em `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm run format` — Prettier (grava alterações)
- `npm run preview` — preview do build

## Arquitetura

```
src/
  components/   componentes de UI (ui, layout, shared, auth)
  pages/        páginas por módulo/rota
  layouts/      layouts de app e autenticação
  hooks/        hooks reutilizáveis (React Query, auth, etc.)
  contexts/     contextos React (autenticação)
  services/     regras de negócio sobre os repositórios
  repositories/ acesso direto ao Supabase por tabela
  schemas/      validações Zod
  types/        tipos gerados do banco + aliases de domínio
  constants/    constantes (navegação, opções fixas)
  providers/    providers globais (tema, query client)
  lib/          utilitários (supabase client, formatação, cn)
```

## Banco de dados

O schema completo (tabelas, RLS, triggers, views) vive no projeto Supabase `financeiro-leonardo` e é gerenciado via migrations aplicadas pelo MCP do Supabase.
