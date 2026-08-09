# Fase 4 — Cartões e Faturas

> Primeiro módulo da Fase 4. Backend (`credit_cards`, `card_invoices`,
> `v_card_usage`, trigger `recalc_invoice_total`) já existia desde a Fase 1,
> sem UI. Esta sessão implementou a UI completa e a integração com
> Transações, reaproveitando 100% da arquitetura em camadas já estabelecida
> (`repository → service → hook → component/page`). Nenhuma migration
> alterou tabela, coluna ou lógica financeira crítica — a única mudança de
> banco foi um hardening de segurança pontual (seção "Migration aplicada"
> abaixo).

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
