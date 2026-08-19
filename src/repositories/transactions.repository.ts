import { supabase } from "@/lib/supabase"
import type {
  PaymentMethod,
  Transaction,
  TransactionEnriched,
  TransactionType,
} from "@/types"
import type { TransactionFormValues } from "@/schemas/transaction.schema"
import type { CardPurchaseFormValues } from "@/schemas/card-purchase.schema"

export type StatusFilter =
  | "todos"
  | "pendente"
  | "parcial"
  | "atrasado"
  | "pago"
  | "recebido"
  | "cancelado"

export type TransactionSortBy = "date" | "amount" | "description" | "status"

export interface TransactionListFilters {
  search?: string
  type?: TransactionType | "todos"
  status?: StatusFilter
  accountId?: string | "todos"
  categoryId?: string | "todos"
  costCenterId?: string | "todos"
  paymentMethod?: PaymentMethod | "todos"
  dateFrom?: string | null
  dateTo?: string | null
  amountMin?: number | null
  amountMax?: number | null
  tagIds?: string[]
  onlyInstallments?: boolean
  onlyRecurring?: boolean
  trashed?: boolean
  sortBy?: TransactionSortBy
  sortDir?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export interface TransactionListResult {
  data: TransactionEnriched[]
  count: number
}

export interface TransactionTotals {
  income: number
  expense: number
  balance: number
}

/**
 * Payload comum a criação e edição de um lançamento único. `status` não
 * entra mais aqui: nasce/permanece "pendente" por padrão de coluna e é
 * sempre derivado por `paid_amount` na trigger `sync_transaction_payment_state`
 * (exceto a transição manual para "cancelado", feita por `setStatus`).
 * `values.settled` é tratado em `transactions.service.ts::create`, que
 * registra um pagamento cheio logo após a criação quando marcado.
 */
function toRow(userId: string, values: TransactionFormValues) {
  return {
    user_id: userId,
    type: values.type,
    description: values.description,
    amount: values.amount,
    account_id: values.account_id,
    category_id: values.category_id,
    cost_center_id: values.cost_center_id,
    date: values.date,
    due_date: values.due_date,
    supplier: values.supplier || null,
    payment_method: values.payment_method,
    notes: values.notes || null,
  }
}

async function replaceTags(transactionId: string, tagIds: string[]) {
  const { error: deleteError } = await supabase
    .from("transaction_tags")
    .delete()
    .eq("transaction_id", transactionId)
  if (deleteError) throw deleteError

  if (tagIds.length === 0) return

  const { error } = await supabase
    .from("transaction_tags")
    .insert(tagIds.map((tag_id) => ({ transaction_id: transactionId, tag_id })))
  if (error) throw error
}

export const transactionsRepository = {
  async list(
    userId: string,
    filters: TransactionListFilters
  ): Promise<TransactionListResult> {
    const {
      search,
      type = "todos",
      status = "todos",
      accountId = "todos",
      categoryId = "todos",
      costCenterId = "todos",
      paymentMethod = "todos",
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      tagIds = [],
      onlyInstallments,
      onlyRecurring,
      trashed = false,
      sortBy = "date",
      sortDir = "desc",
      page = 1,
      pageSize = 20,
    } = filters

    let query = supabase
      .from("v_transactions_enriched")
      .select("*", { count: "exact" })
      .eq("user_id", userId)

    query = trashed
      ? query.not("deleted_at", "is", null)
      : query.is("deleted_at", null)

    if (type !== "todos") query = query.eq("type", type)

    // "pendente"/"parcial" = a vencer; "atrasado" = vencido (qualquer status
    // ainda em aberto, pendente ou parcial, com due_date no passado — ver
    // is_overdue na view). Tabs sem sobreposição.
    if (status === "atrasado") {
      query = query.eq("is_overdue", true)
    } else if (status === "pendente") {
      query = query.eq("status", "pendente").eq("is_overdue", false)
    } else if (status === "parcial") {
      query = query
        .in("status", ["parcialmente_pago", "parcialmente_recebido"])
        .eq("is_overdue", false)
    } else if (status !== "todos") {
      query = query.eq("status", status)
    }

    if (accountId !== "todos") query = query.eq("account_id", accountId)
    if (categoryId !== "todos") query = query.eq("category_id", categoryId)
    if (costCenterId !== "todos") query = query.eq("cost_center_id", costCenterId)
    if (paymentMethod !== "todos") query = query.eq("payment_method", paymentMethod)
    if (dateFrom) query = query.gte("date", dateFrom)
    if (dateTo) query = query.lte("date", dateTo)
    if (amountMin != null) query = query.gte("amount", amountMin)
    if (amountMax != null) query = query.lte("amount", amountMax)
    if (tagIds.length > 0) query = query.contains("tag_ids", tagIds)
    if (onlyInstallments) query = query.not("installment_group_id", "is", null)
    if (onlyRecurring) query = query.not("recurring_id", "is", null)

    if (search && search.trim()) {
      const term = `%${search.trim()}%`
      query = query.or(
        `description.ilike.${term},supplier.ilike.${term},notes.ilike.${term}`
      )
    }

    const ascending = sortDir === "asc"
    const sortColumn = sortBy === "status" ? "effective_status" : sortBy
    query = query.order(sortColumn, { ascending })
    // Desempate estável para páginas determinísticas.
    if (sortBy !== "date") query = query.order("date", { ascending: false })
    query = query.order("id", { ascending: false })

    const from = (page - 1) * pageSize
    const { data, error, count } = await query.range(from, from + pageSize - 1)
    if (error) throw error

    return { data: data ?? [], count: count ?? 0 }
  },

  /**
   * Totais do conjunto filtrado (independente da página). Soma
   * `paid_amount`, não `amount` — cobre liquidação total e parcial da
   * mesma forma, sem gate de status (uma transação pendente/cancelada já
   * tem `paid_amount = 0`, então não precisa de filtro extra).
   */
  async totals(userId: string, filters: TransactionListFilters): Promise<TransactionTotals> {
    const { dateFrom, dateTo, accountId = "todos" } = filters

    let query = supabase
      .from("transactions")
      .select("type, paid_amount")
      .eq("user_id", userId)
      .is("deleted_at", null)

    if (dateFrom) query = query.gte("date", dateFrom)
    if (dateTo) query = query.lte("date", dateTo)
    if (accountId !== "todos") query = query.eq("account_id", accountId)

    const { data, error } = await query
    if (error) throw error

    let income = 0
    let expense = 0
    for (const row of data ?? []) {
      if (row.type === "receita") income += Number(row.paid_amount)
      else expense += Number(row.paid_amount)
    }
    return { income, expense, balance: income - expense }
  },

  async getById(id: string): Promise<TransactionEnriched | null> {
    const { data, error } = await supabase
      .from("v_transactions_enriched")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async create(userId: string, values: TransactionFormValues): Promise<Transaction> {
    const { data, error } = await supabase
      .from("transactions")
      .insert(toRow(userId, values))
      .select("*")
      .single()
    if (error) throw error

    if (values.tag_ids.length > 0) await replaceTags(data.id, values.tag_ids)
    return data
  },

  async update(id: string, userId: string, values: TransactionFormValues): Promise<Transaction> {
    const { user_id: _ignored, ...row } = toRow(userId, values)
    const { data, error } = await supabase
      .from("transactions")
      .update(row)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error

    await replaceTags(id, values.tag_ids)
    return data
  },

  /** Cria as N parcelas de forma atômica (rateio sem perder centavos). */
  async createInstallments(values: TransactionFormValues): Promise<string> {
    const { data, error } = await supabase.rpc("create_installment_transactions", {
      p_type: values.type,
      p_description: values.description,
      p_total_amount: values.amount,
      p_installments: values.installments!,
      p_first_due_date: values.due_date ?? values.date,
      p_account_id: values.account_id,
      p_category_id: values.category_id,
      p_cost_center_id: values.cost_center_id ?? undefined,
      p_supplier: values.supplier || undefined,
      p_payment_method: values.payment_method ?? undefined,
      p_notes: values.notes || undefined,
    })
    if (error) throw error
    return data
  },

  /**
   * Só para as transições sem movimentação de dinheiro: cancelar e
   * reativar. Liquidar (total ou parcial) é sempre via
   * `transactionPaymentsRepository.create` — a trigger
   * `sync_transaction_payment_state` deriva pago/recebido/parcial a partir
   * de `paid_amount`, então gravar esses status diretamente aqui não teria
   * efeito (seria sobrescrito). O banco também bloqueia cancelar com
   * `paid_amount > 0`.
   */
  async setStatus(id: string, status: "pendente" | "cancelado"): Promise<void> {
    const { error } = await supabase.from("transactions").update({ status }).eq("id", id)
    if (error) throw error
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from("transactions")
      .update({ deleted_at: null })
      .eq("id", id)
    if (error) throw error
  },

  /** Exclui todas as parcelas ainda não liquidadas de um grupo. */
  async softDeleteInstallmentGroup(groupId: string): Promise<void> {
    const { error } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("installment_group_id", groupId)
      .eq("status", "pendente")
    if (error) throw error
  },

  async countTrashed(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
    if (error) throw error
    return count ?? 0
  },

  /**
   * Compra no cartão (Fase 4): sempre `account_id: null` — a
   * `_transaction_balance_effect` retorna 0 quando a conta é nula, então
   * uma compra no cartão nunca mexe em saldo de conta sozinha. Nasce
   * "pendente" porque a liquidação acontece coletivamente ao pagar a
   * fatura (ver `createInvoiceSettlement`), não por compra individual.
   */
  async createCardPurchase(
    userId: string,
    cardId: string,
    invoiceId: string,
    values: CardPurchaseFormValues
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "despesa",
        description: values.description,
        amount: values.amount,
        date: values.date,
        category_id: values.category_id,
        cost_center_id: values.cost_center_id,
        supplier: values.supplier || null,
        notes: values.notes || null,
        card_id: cardId,
        invoice_id: invoiceId,
        account_id: null,
        status: "pendente",
      })
      .select("*")
      .single()
    if (error) throw error

    if (values.tag_ids.length > 0) await replaceTags(data.id, values.tag_ids)
    return data
  },

  /**
   * Transação de despesa comum que representa o pagamento de uma fatura —
   * `account_id` setado, nasce no shape "pendente" (a trigger
   * `sync_transaction_payment_state` deriva isso de `paid_amount = 0`).
   * Quem efetivamente marca como paga e afeta o saldo da conta é a
   * movimentação cheia registrada logo em seguida por
   * `card-invoices.service.ts::payInvoice` — mesma fonte de verdade de
   * qualquer pagamento parcial, sem mecanismo separado. `invoice_id` fica
   * de propósito fora do payload: se apontasse para a própria fatura,
   * `recalc_invoice_total` somaria o pagamento de volta no total dela
   * (`select sum(amount) from transactions where invoice_id = ...`),
   * inflando o valor. Ver docs/MODULO_4.md.
   */
  async createInvoiceSettlement(
    userId: string,
    cardId: string,
    accountId: string,
    amount: number,
    description: string
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "despesa",
        description,
        amount,
        date: new Date().toISOString().slice(0, 10),
        account_id: accountId,
        card_id: cardId,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },
}
