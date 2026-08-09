import { supabase } from "@/lib/supabase"
import type { InvestmentMovement } from "@/types"
import type { InvestmentMovementFormValues } from "@/schemas/investment.schema"

export const investmentMovementsRepository = {
  async listByInvestment(investmentId: string): Promise<InvestmentMovement[]> {
    const { data, error } = await supabase
      .from("investment_movements")
      .select("*")
      .eq("investment_id", investmentId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async create(
    userId: string,
    investmentId: string,
    values: InvestmentMovementFormValues
  ): Promise<InvestmentMovement> {
    const { data, error } = await supabase
      .from("investment_movements")
      .insert({
        user_id: userId,
        investment_id: investmentId,
        type: values.type,
        amount: values.amount,
        date: values.date,
        notes: values.notes || null,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /** `apply_investment_movement` reprocessa o delta completo em UPDATE
   * (reverte o efeito antigo, aplica o novo) — editar tipo/valor é seguro. */
  async update(id: string, values: InvestmentMovementFormValues): Promise<InvestmentMovement> {
    const { data, error } = await supabase
      .from("investment_movements")
      .update({
        type: values.type,
        amount: values.amount,
        date: values.date,
        notes: values.notes || null,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("investment_movements").delete().eq("id", id)
    if (error) throw error
  },
}
