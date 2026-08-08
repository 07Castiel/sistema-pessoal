# Fase 3 — Receitas e Despesas

Núcleo de lançamentos financeiros. Esta fase estabelece a arquitetura que os
módulos seguintes (transferências, cartões, faturas, orçamentos, metas, fluxo
de caixa, relatórios) irão reutilizar.

## Decisão central: entidade única

Receita e despesa **não** são tabelas separadas. Ambas são linhas de
`public.transactions`, distinguidas por `type`. Isso evita duplicar toda a
lógica de saldo, status, soft delete, auditoria e busca.

### Por que o enum `transaction_type` tem apenas `receita | despesa`

Os demais tipos citados no escopo já têm modelagem própria ou são casos de uso
dos dois existentes:

| Conceito | Como é representado |
|---|---|
| Transferência | Tabela `transfers` (envolve 2 contas, trigger de saldo dedicado) |
| Pagamento de fatura | Despesa com `card_id` / `invoice_id` |
| Investimento (aporte) | Despesa com categoria de tipo `investimento` |
| Rendimento | Receita com categoria de tipo `investimento` |
| Reembolso | Futuro: receita com `reverses_transaction_id` |

Adicionar valor a enum é incremental e não quebra nada. Inflar o enum agora
criaria estados sem semântica implementada.

## Valores monetários

- `numeric(14,2)` — nunca floating point.
- `amount` é **sempre positivo**; o sinal vem de `type`.
- `currency char(3) not null default 'BRL'` — coluna preparada para
  multi-moeda sem reescrever o núcleo. A conversão entre moedas não está
  implementada.

## Status

O banco armazena apenas a **intenção**:

| Status | Uso |
|---|---|
| `pendente` | Ainda não liquidado |
| `recebido` | Receita liquidada |
| `pago` | Despesa liquidada |
| `cancelado` | Anulado, sem efeito no saldo |

`atrasado` **nunca é gravado**. É derivado na view:

```sql
status = 'pendente' AND due_date IS NOT NULL AND due_date < current_date
```

Motivo: um status armazenado exigiria um job diário e ficaria incorreto entre
execuções. Derivado, está sempre correto — inclusive com o navegador fechado.
A trigger `validate_transaction_status` recusa qualquer tentativa de gravar
`atrasado`.

### Transições permitidas

```
pendente  → recebido/pago   (liquidar)
pendente  → cancelado
recebido/pago → pendente    (estornar)
cancelado → pendente        (reativar)
```

Bloqueadas: receita com status `pago`, despesa com status `recebido`.

## Saldo das contas

**Não há mecanismo novo.** O trigger `trg_transactions_balance` do Módulo 1 foi
reaproveitado. Ele usa modelo de *delta*:

```
UPDATE → saldo −= efeito(OLD); saldo += efeito(NEW)
```

`_transaction_balance_effect` foi estendido para retornar `0` quando
`deleted_at is not null`. Como o trigger é delta, **soft delete e restauração
passaram a ficar corretos automaticamente**, sem código adicional.

```sql
account_id IS NULL          → 0
deleted_at IS NOT NULL      → 0
receita  + recebido         → +amount
despesa  + pago             → −amount
qualquer outro caso         →  0
```

### Concorrência

`UPDATE accounts SET current_balance = current_balance + delta` é atômico sob
READ COMMITTED: o Postgres re-lê a linha sob lock dentro do próprio comando.
Duas liquidações simultâneas não se perdem.

## Integridade e segurança

A policy de INSERT valida apenas `user_id`. Sem proteção adicional, o usuário A
conseguiria criar um lançamento apontando para a conta do usuário B. A trigger
`validate_transaction_references` fecha essa brecha validando que
`account_id`, `category_id`, `cost_center_id` e `card_id` pertencem ao mesmo
`user_id` — e que a conta/categoria não está excluída.

### Compatibilidade de categoria

| Tipo da categoria | Receita | Despesa |
|---|---|---|
| `receita` | ✅ | ❌ |
| `despesa` | ❌ | ✅ |
| `investimento` | ✅ | ✅ |
| `transferencia` | ❌ | ❌ |

Regra aplicada no banco (trigger) **e** espelhada no frontend
(`useTransactionLookups`), para que a opção inválida nem apareça.

## Parcelamentos

RPC atômica `create_installment_transactions`. Gera as N linhas de uma vez,
ligadas por `installment_group_id`, cada uma com `installment_number` e
`installment_total`.

**Rateio sem perder centavos:** as N−1 primeiras usam o valor truncado e a
última absorve a diferença.

```
100,00 / 3  → 33,33 + 33,33 + 33,34 = 100,00
1.000,00/24 → 23 × 41,66 + 41,82    = 1.000,00
```

Cada parcela tem seu próprio vencimento (mês a mês) e é liquidada
individualmente. `date = due_date` para que cada parcela pertença ao mês certo
nos relatórios.

## Recorrências

Modelo baseado em **regra**, não em materialização em massa.

`recurring_rules` guarda o template. A RPC `generate_due_recurrences()`
materializa apenas as ocorrências já vencidas (respeitando `lead_days`),
chamada sob demanda ao abrir o app.

Frequências: semanal, quinzenal, mensal, bimestral, trimestral, semestral,
anual e personalizada (via `interval_days`).

**Idempotência:** o `FOR UPDATE` serializa chamadas concorrentes e o avanço de
`next_run_date` impede duplicação. Um guard de 240 iterações evita laço
infinito.

Ativar/pausar = `active`. Encerrar = `active=false` + `end_date=hoje`.

## Views

| View | Uso |
|---|---|
| `v_transactions_enriched` | Listagem: junta categoria/conta/centro de custo, agrega tags e deriva `is_overdue` / `effective_status`. Evita N+1. |
| `v_cash_flow_daily` | Base para o módulo de Fluxo de Caixa: entradas, saídas e líquido por dia liquidado. |
| `v_pending_by_due_date` | Contas a pagar / a receber por vencimento. |

Todas com `security_invoker = true` (respeitam o RLS das tabelas base).

> Manutenção: as views listam colunas explicitamente. Ao adicionar coluna em
> `transactions`, atualize `v_transactions_enriched`.

## Paginação

Optamos por **paginação por offset com contagem exata**, não por cursor.

Motivo: o requisito de exibir "página X de Y" e o total de resultados é
incompatível com cursor puro (que não conhece o total nem permite salto de
página). Para o volume de um app financeiro pessoal, o offset é adequado e é
coberto pelo índice `idx_transactions_user_date_id`. Se o volume crescer muito,
o caminho de migração é keyset com scroll infinito.

## Índices

| Índice | Finalidade |
|---|---|
| `idx_transactions_user_date_id` | Listagem principal (parcial: `deleted_at is null`) |
| `idx_transactions_user_due` | Vencimentos / derivação de atraso |
| `idx_transactions_user_trashed` | Lixeira |
| `idx_transactions_user_paid_date` | Agregações do dashboard e fluxo de caixa |
| `*_trgm` (description, supplier, notes) | Busca parcial `ILIKE '%termo%'` via `pg_trgm` |
| FKs | `cost_center_id`, `recurring_id`, `invoice_id`, `transaction_tags.tag_id`, `attachments.user_id` |

`pg_trgm` fica no schema `extensions` (não em `public`).

## Auditoria

`trg_audit_transactions` e `trg_audit_recurring_rules` usam o
`audit_trigger_fn` genérico do Módulo 1: registram ação, valor anterior/novo
em JSONB, IP e user-agent.

## Migrations desta fase

| Migration | Conteúdo |
|---|---|
| `0024` | `deleted_at`, `currency`, correção do efeito de saldo, normalização de `paid_date` |
| `0025` | Constraint de valor positivo, validação de ownership, coerência tipo/status |
| `0026` | Índices e `pg_trgm` |
| `0027` | RLS otimizado com `(select auth.uid())` + auditoria |
| `0028` | Views enriquecida, fluxo de caixa e pendências |
| `0029` | Novas frequências no enum |
| `0030` | Campos de template em `recurring_rules` |
| `0031` | RPCs de parcelamento e recorrência |
| `0032` | Move `pg_trgm` para `extensions` |
| `0033` | Tags agregadas na view enriquecida |

## Hardening pós-Fase 3: EXECUTE das functions de saldo (migration 0034)

As functions reaproveitadas do Módulo 1 nesta fase — `_transaction_balance_effect`
(estendida na `0024`) e `apply_transaction_balance` — faziam parte de um grupo
de 11 functions legadas que nunca tiveram o `EXECUTE` padrão do Postgres
revogado de `PUBLIC`/`anon`/`authenticated`. Corrigido numa sessão de
hardening dedicada, documentada em detalhe em
[`docs/CONTEXTO_PROJETO.md`, seção 31](./CONTEXTO_PROJETO.md).

Ponto relevante para quem mexer nesta área no futuro: `_transaction_balance_effect`
é chamada explicitamente de dentro de `apply_transaction_balance`
(`SECURITY INVOKER`), então **precisa manter `EXECUTE` para `authenticated`**
— diferente das outras 10 functions (`RETURNS trigger`), que não precisam de
`EXECUTE` nenhum porque o disparo de trigger não passa pela checagem de
`EXECUTE` do Postgres. Se `_transaction_balance_effect` for refatorada no
futuro (ex.: virar `SECURITY DEFINER`, ou deixar de ser chamada por
`apply_transaction_balance`), essa concessão precisa ser reavaliada.

Regressão financeira completa (receita, despesa, alteração de valor,
alteração de status, soft delete, restauração, transferência, parcelamento)
foi reexecutada como role `authenticated` após a migration, sem nenhuma
falha.

## Finalização da fase (2026-08-08)

As pendências abertas no fim da implementação inicial — tela de
recorrências, anexos no formulário, CRUD de tags e centros de custo,
dashboard com dados reais — foram todas resolvidas numa sessão de
finalização dedicada. Detalhamento completo (arquivos, RPCs reaproveitadas,
bugs encontrados e testes executados) em
[`docs/CONTEXTO_PROJETO.md`, seção 32](./CONTEXTO_PROJETO.md). Resumo dos
dois achados relevantes para quem mexer nesta área:

- **Migration `0035`**: `cost_centers` ganhou coluna `active` (aditiva,
  default `true`) para suportar ativar/desativar sem soft delete — a tabela
  não tem `deleted_at`; exclusão continua sendo `DELETE` físico, seguro
  porque as FKs de `transactions`/`recurring_rules` para `cost_centers` são
  `ON DELETE SET NULL`.
- **Bug real**: componentes com `<button>` sem `type="button"` funcionam
  bem isolados, mas se um dia forem renderizados dentro de um `<form>`
  (como `AttachmentsPanel` passou a ser, dentro do formulário de
  transação), qualquer clique nesses botões submete o formulário inteiro
  em vez de executar sua própria ação. Vale revisar outros componentes
  compartilhados com essa mesma característica antes de reutilizá-los
  dentro de um `<form>`.

## Limitações conhecidas

- Conversão entre moedas não implementada (apenas a coluna existe).
- Recorrências são geradas sob demanda; sem `pg_cron`, ficar meses sem abrir o
  app adia a materialização (o valor gerado é o mesmo, apenas mais tarde).
- Bundle de produção ainda em um único chunk (~1,45 MB / 411 KB gzip);
  code-splitting por rota é uma otimização futura, não bloqueante.
- Documentação complementar (`ARQUITETURA.md`, `BANCO_DE_DADOS.md`,
  `REGRAS_DE_NEGOCIO.md`) ainda não existe.
