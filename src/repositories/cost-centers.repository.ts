import { supabase } from "@/lib/supabase"
import type { CostCenter } from "@/types"

export const costCentersRepository = {
  async list(userId: string): Promise<CostCenter[]> {
    const { data, error } = await supabase
      .from("cost_centers")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async create(userId: string, name: string, color: string, icon: string): Promise<CostCenter> {
    const { data, error } = await supabase
      .from("cost_centers")
      .insert({ user_id: userId, name, color, icon })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, name: string, color: string, icon: string): Promise<CostCenter> {
    const { data, error } = await supabase
      .from("cost_centers")
      .update({ name, color, icon })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase.from("cost_centers").update({ active }).eq("id", id)
    if (error) throw error
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("cost_centers").delete().eq("id", id)
    if (error) throw error
  },

  async countUsage(costCenterId: string): Promise<number> {
    const { count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("cost_center_id", costCenterId)
    if (error) throw error
    return count ?? 0
  },

  /** Uma consulta só para o contador de todos os centros de custo da lista. */
  async countUsageBatch(costCenterIds: string[]): Promise<Record<string, number>> {
    if (costCenterIds.length === 0) return {}
    const { data, error } = await supabase
      .from("transactions")
      .select("cost_center_id")
      .in("cost_center_id", costCenterIds)
    if (error) throw error

    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      const id = row.cost_center_id as string
      counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  },
}
