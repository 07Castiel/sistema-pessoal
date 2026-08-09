import { supabase } from "@/lib/supabase"
import type { CardInvoice, TransactionEnriched } from "@/types"
import type { InvoicePeriod } from "@/lib/card-invoice"

export const cardInvoicesRepository = {
  async listByCard(cardId: string): Promise<CardInvoice[]> {
    const { data, error } = await supabase
      .from("card_invoices")
      .select("*")
      .eq("card_id", cardId)
      .order("reference_month", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<CardInvoice | null> {
    const { data, error } = await supabase.from("card_invoices").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data
  },

  async findByCardAndMonth(cardId: string, referenceMonth: string): Promise<CardInvoice | null> {
    const { data, error } = await supabase
      .from("card_invoices")
      .select("*")
      .eq("card_id", cardId)
      .eq("reference_month", referenceMonth)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async create(userId: string, cardId: string, period: InvoicePeriod): Promise<CardInvoice> {
    const { data, error } = await supabase
      .from("card_invoices")
      .insert({
        user_id: userId,
        card_id: cardId,
        reference_month: period.referenceMonth,
        closing_date: period.closingDate,
        due_date: period.dueDate,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /** Transações desta fatura, mais recentes primeiro — reaproveita a view enriquecida. */
  async listTransactions(invoiceId: string): Promise<TransactionEnriched[]> {
    const { data, error } = await supabase
      .from("v_transactions_enriched")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("date", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  /**
   * Marca a fatura como paga. Não mexe em `apply_transaction_balance`
   * nem em `_transaction_balance_effect` — o efeito no saldo da conta
   * pagadora acontece através de uma transação de despesa comum, criada
   * separadamente pelo service (ver card-invoices.service.ts).
   */
  async markAsPaid(id: string, paidAccountId: string): Promise<void> {
    const { error } = await supabase
      .from("card_invoices")
      .update({ status: "paga", paid_account_id: paidAccountId, paid_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
  },
}
