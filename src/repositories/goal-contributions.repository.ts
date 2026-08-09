import { supabase } from "@/lib/supabase"
import type { GoalContribution } from "@/types"
import type { GoalContributionFormValues } from "@/schemas/goal.schema"

export const goalContributionsRepository = {
  async listByGoal(goalId: string): Promise<GoalContribution[]> {
    const { data, error } = await supabase
      .from("goal_contributions")
      .select("*")
      .eq("goal_id", goalId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  /** Retirada é gravada como valor negativo (sem coluna de tipo no banco). */
  async create(
    userId: string,
    goalId: string,
    values: GoalContributionFormValues
  ): Promise<GoalContribution> {
    const signedAmount = values.kind === "retirada" ? -values.amount : values.amount
    const { data, error } = await supabase
      .from("goal_contributions")
      .insert({
        user_id: userId,
        goal_id: goalId,
        amount: signedAmount,
        date: values.date,
        notes: values.notes || null,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("goal_contributions").delete().eq("id", id)
    if (error) throw error
  },
}
