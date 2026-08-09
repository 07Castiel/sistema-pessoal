import { supabase } from "@/lib/supabase"
import type { CardUsage, CreditCard } from "@/types"
import type { CreditCardFormValues } from "@/schemas/credit-card.schema"

export const creditCardsRepository = {
  async list(userId: string): Promise<CreditCard[]> {
    const { data, error } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<CreditCard | null> {
    const { data, error } = await supabase.from("credit_cards").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data
  },

  /** Uso de limite (limite, usado, disponível) por cartão — v_card_usage. */
  async usage(userId: string): Promise<CardUsage[]> {
    const { data, error } = await supabase.from("v_card_usage").select("*").eq("user_id", userId)
    if (error) throw error
    return data ?? []
  },

  async create(userId: string, values: CreditCardFormValues): Promise<CreditCard> {
    const { data, error } = await supabase
      .from("credit_cards")
      .insert({
        user_id: userId,
        name: values.name,
        bank: values.bank || null,
        brand: values.brand,
        color: values.color,
        icon: values.icon,
        credit_limit: values.credit_limit,
        closing_day: values.closing_day,
        due_day: values.due_day,
        account_id: values.account_id,
        status: values.status,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, values: CreditCardFormValues): Promise<CreditCard> {
    const { data, error } = await supabase
      .from("credit_cards")
      .update({
        name: values.name,
        bank: values.bank || null,
        brand: values.brand,
        color: values.color,
        icon: values.icon,
        credit_limit: values.credit_limit,
        closing_day: values.closing_day,
        due_day: values.due_day,
        account_id: values.account_id,
        status: values.status,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async setStatus(id: string, status: CreditCard["status"]): Promise<void> {
    const { error } = await supabase.from("credit_cards").update({ status }).eq("id", id)
    if (error) throw error
  },

  /**
   * Exclusão física — sem `deleted_at` nesta tabela (diferente de Contas).
   * Segura: `card_invoices.card_id` é ON DELETE CASCADE (as faturas do
   * cartão são removidas junto), e `transactions.card_id`/`invoice_id` são
   * ON DELETE SET NULL — nenhuma transação real é apagada, só perde o
   * vínculo com o cartão/fatura excluído. Confirmado via pg_constraint
   * antes de implementar.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("credit_cards").delete().eq("id", id)
    if (error) throw error
  },

  async countInvoices(cardId: string): Promise<number> {
    const { count, error } = await supabase
      .from("card_invoices")
      .select("*", { count: "exact", head: true })
      .eq("card_id", cardId)
    if (error) throw error
    return count ?? 0
  },
}
