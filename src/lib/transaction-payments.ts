import type { TransactionStatus, TransactionType } from "@/types"

function toCents(value: number): number {
  return Math.round(value * 100)
}

function fromCents(cents: number): number {
  return cents / 100
}

/**
 * Saldo restante de um lançamento, nunca negativo. Cálculo em cêntimos
 * inteiros (mesmo padrão de `currency-input.tsx`) para não acumular erro de
 * ponto flutuante.
 */
export function calculateRemainingAmount(amount: number, paidAmount: number): number {
  const remainingCents = toCents(amount) - toCents(paidAmount)
  return fromCents(Math.max(remainingCents, 0))
}

/**
 * Espelha a derivação de status feita pela trigger
 * `sync_transaction_payment_state` no banco (fonte de verdade real) — usada
 * aqui só para feedback otimista na UI antes do round-trip ao banco.
 * `cancelado` nunca é alterado por esta função, mesma regra do banco.
 */
export function deriveTransactionStatus(
  type: TransactionType,
  amount: number,
  paidAmount: number,
  currentStatus: TransactionStatus
): TransactionStatus {
  if (currentStatus === "cancelado") return "cancelado"

  const amountCents = toCents(amount)
  const paidCents = toCents(paidAmount)

  if (paidCents <= 0) return "pendente"
  if (paidCents >= amountCents) return type === "receita" ? "recebido" : "pago"
  return type === "receita" ? "parcialmente_recebido" : "parcialmente_pago"
}
