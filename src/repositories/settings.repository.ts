import { supabase } from "@/lib/supabase"
import type { Profile } from "@/types"
import type { ProfileFormValues, FinancialGoalsFormValues } from "@/schemas/profile.schema"

export const settingsRepository = {
  async updateProfile(userId: string, values: ProfileFormValues): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name,
        avatar_url: values.avatar_url,
      })
      .eq("id", userId)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async updateFinancialGoals(userId: string, values: FinancialGoalsFormValues): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        monthly_goal: values.monthly_goal,
        annual_goal: values.annual_goal,
      })
      .eq("id", userId)
      .select("*")
      .single()
    if (error) throw error
    return data
  },
}
