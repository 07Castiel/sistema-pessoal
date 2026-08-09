import { supabase } from "@/lib/supabase"
import type { Goal } from "@/types"
import type { GoalFormValues } from "@/schemas/goal.schema"

export const goalsRepository = {
  async list(userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("target_date", { ascending: true, nullsFirst: false })
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Goal | null> {
    const { data, error } = await supabase.from("goals").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data
  },

  async create(userId: string, values: GoalFormValues): Promise<Goal> {
    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        name: values.name,
        target_amount: values.target_amount,
        target_date: values.target_date,
        priority: values.priority,
        category_id: values.category_id,
        color: values.color,
        icon: values.icon,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /** Nunca escreve `current_amount` — é 100% derivado por `recalc_goal_amount`. */
  async update(id: string, values: GoalFormValues): Promise<Goal> {
    const { data, error } = await supabase
      .from("goals")
      .update({
        name: values.name,
        target_amount: values.target_amount,
        target_date: values.target_date,
        priority: values.priority,
        category_id: values.category_id,
        color: values.color,
        icon: values.icon,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async setStatus(id: string, status: Goal["status"]): Promise<void> {
    const { error } = await supabase.from("goals").update({ status }).eq("id", id)
    if (error) throw error
  },

  /**
   * Exclusão física — sem `deleted_at` nesta tabela. `goal_contributions`
   * é ON DELETE CASCADE (o histórico de aportes da meta é removido
   * junto); nenhuma outra tabela referencia `goals`, então nada além do
   * próprio histórico da meta é afetado.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("goals").delete().eq("id", id)
    if (error) throw error
  },
}
