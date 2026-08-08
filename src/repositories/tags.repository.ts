import { supabase } from "@/lib/supabase"
import type { Tag } from "@/types"

export const tagsRepository = {
  async list(userId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async create(userId: string, name: string, color: string): Promise<Tag> {
    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: userId, name, color })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, name: string, color: string): Promise<Tag> {
    const { data, error } = await supabase
      .from("tags")
      .update({ name, color })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("tags").delete().eq("id", id)
    if (error) throw error
  },

  async countUsage(tagId: string): Promise<number> {
    const { count, error } = await supabase
      .from("transaction_tags")
      .select("*", { count: "exact", head: true })
      .eq("tag_id", tagId)
    if (error) throw error
    return count ?? 0
  },

  /** Uma consulta só para o contador de todas as tags da lista. */
  async countUsageBatch(tagIds: string[]): Promise<Record<string, number>> {
    if (tagIds.length === 0) return {}
    const { data, error } = await supabase
      .from("transaction_tags")
      .select("tag_id")
      .in("tag_id", tagIds)
    if (error) throw error

    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      counts[row.tag_id] = (counts[row.tag_id] ?? 0) + 1
    }
    return counts
  },
}
