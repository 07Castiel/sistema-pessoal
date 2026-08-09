import { supabase } from "@/lib/supabase"
import type { Investment } from "@/types"
import type { InvestmentFormValues } from "@/schemas/investment.schema"

export const investmentsRepository = {
  async list(userId: string): Promise<Investment[]> {
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", userId)
      .order("application_date", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Investment | null> {
    const { data, error } = await supabase.from("investments").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data
  },

  /** `applied_amount`/`current_amount` nunca são escritos aqui — nascem
   * em 0 (default do banco) e só mudam via `apply_investment_movement`. */
  async create(userId: string, values: InvestmentFormValues): Promise<Investment> {
    const { data, error } = await supabase
      .from("investments")
      .insert({
        user_id: userId,
        name: values.name,
        type: values.type,
        institution: values.institution || null,
        application_date: values.application_date,
        maturity_date: values.maturity_date,
        liquidity: values.liquidity || null,
        rate_description: values.rate_description || null,
        account_id: values.account_id,
        notes: values.notes || null,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, values: InvestmentFormValues): Promise<Investment> {
    const { data, error } = await supabase
      .from("investments")
      .update({
        name: values.name,
        type: values.type,
        institution: values.institution || null,
        application_date: values.application_date,
        maturity_date: values.maturity_date,
        liquidity: values.liquidity || null,
        rate_description: values.rate_description || null,
        account_id: values.account_id,
        notes: values.notes || null,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Exclusão física — sem `deleted_at` nem coluna de status nesta tabela
   * (diferente de Contas/Categorias/Transações/Recorrências). Não há
   * como "restaurar" no schema atual; segura porque
   * `investment_movements.investment_id` é ON DELETE CASCADE (some o
   * histórico junto) e nenhuma outra tabela referencia `investments`.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("investments").delete().eq("id", id)
    if (error) throw error
  },
}
