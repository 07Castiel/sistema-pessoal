import { supabase } from "@/lib/supabase"
import type { Category } from "@/types"
import type { CategoryFormValues } from "@/schemas/category.schema"

export const categoriesRepository = {
  /**
   * Fetches every category for the user (active and soft-deleted) in a single
   * round trip. Active/trashed views are derived client-side so a deleted
   * subcategory always resolves its parent's name, even when the parent
   * itself is still active.
   */
  async list(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async create(userId: string, values: CategoryFormValues): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: values.name,
        type: values.type,
        icon: values.icon,
        color: values.color,
        parent_id: values.parent_id,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, values: CategoryFormValues): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .update({
        name: values.name,
        type: values.type,
        icon: values.icon,
        color: values.color,
        parent_id: values.parent_id,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from("categories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase.from("categories").update({ deleted_at: null }).eq("id", id)
    if (error) throw error
  },

  async reorder(orderedIds: string[]): Promise<void> {
    const { error } = await supabase.rpc("reorder_categories", { p_category_ids: orderedIds })
    if (error) throw error
  },

  async countUsage(categoryId: string): Promise<number> {
    const { count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("category_id", categoryId)
    if (error) throw error
    return count ?? 0
  },

  async countActiveChildren(categoryId: string): Promise<number> {
    const { count, error } = await supabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", categoryId)
      .is("deleted_at", null)
    if (error) throw error
    return count ?? 0
  },
}
