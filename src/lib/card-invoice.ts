import type { CardInvoice, InvoiceStatus } from "@/types"

export interface InvoicePeriod {
  /** Sempre o dia 1 do mês de referência ("YYYY-MM-01") — chave de unicidade por cartão. */
  referenceMonth: string
  closingDate: string
  dueDate: string
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toISODate(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

/** Garante que o dia exista no mês (ex.: dia 31 em fevereiro vira o último dia do mês). */
function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Math.min(day, lastDay)
}

/**
 * Resolve a qual fatura uma compra pertence, a partir da data da compra e do
 * fechamento/vencimento do cartão. Convenção adotada (não há RPC nem trigger
 * para isso no banco — decisão de implementação da Fase 4, documentada em
 * docs/MODULO_4.md):
 *
 * - Compra até o dia de fechamento (inclusive) → fatura do mês corrente.
 * - Compra após o fechamento → fatura do mês seguinte.
 * - Vencimento: primeira ocorrência do dia de vencimento a partir do
 *   fechamento (mesmo mês se due_day > closing_day, senão mês seguinte) —
 *   convenção usual de cartão de crédito brasileiro.
 */
export function resolveInvoicePeriod(
  purchaseDateISO: string,
  closingDay: number,
  dueDay: number
): InvoicePeriod {
  const [y, m, d] = purchaseDateISO.split("-").map(Number)
  let year = y
  let month = m - 1 // 0-indexed

  const closingDayThisMonth = clampDay(year, month, closingDay)
  if (d > closingDayThisMonth) {
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }

  const closingDayClamped = clampDay(year, month, closingDay)
  const closingDate = toISODate(year, month, closingDayClamped)

  let dueYear = year
  let dueMonth = month
  if (dueDay <= closingDayClamped) {
    dueMonth += 1
    if (dueMonth > 11) {
      dueMonth = 0
      dueYear += 1
    }
  }
  const dueDayClamped = clampDay(dueYear, dueMonth, dueDay)
  const dueDate = toISODate(dueYear, dueMonth, dueDayClamped)

  const referenceMonth = toISODate(year, month, 1)

  return { referenceMonth, closingDate, dueDate }
}

/**
 * Status "efetivo" para exibição — o banco só grava `aberta` (criação) e
 * `paga` (pagamento manual, ver card-invoices.service.ts). `fechada` e
 * `atrasada` são sempre derivados a partir das datas, no mesmo espírito do
 * `effective_status`/`is_overdue` já usado para transações
 * (v_transactions_enriched) — nunca gravados no banco.
 */
export function effectiveInvoiceStatus(invoice: Pick<CardInvoice, "status" | "closing_date" | "due_date">): InvoiceStatus {
  if (invoice.status === "paga") return "paga"
  const today = new Date().toISOString().slice(0, 10)
  if (invoice.due_date && invoice.due_date < today) return "atrasada"
  if (invoice.closing_date && invoice.closing_date < today) return "fechada"
  return "aberta"
}
