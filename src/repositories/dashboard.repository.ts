import { supabase } from "@/lib/supabase"
import type { Account, CategorySummary, MonthlySummary, NetWorth, Transaction } from "@/types"

export const dashboardRepository = {
  async getAccounts(userId: string): Promise<Account[]> {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ativa")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
    if (error) throw error
    return data
  },

  async getNetWorth(userId: string): Promise<NetWorth | null> {
    const { data, error } = await supabase
      .from("v_net_worth")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getMonthlySummaries(userId: string, months = 6): Promise<MonthlySummary[]> {
    const { data, error } = await supabase
      .from("v_monthly_summary")
      .select("*")
      .eq("user_id", userId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(months)
    if (error) throw error
    return (data ?? []).reverse()
  },

  async getCategorySummary(
    userId: string,
    year: number,
    month: number
  ): Promise<CategorySummary[]> {
    const { data, error } = await supabase
      .from("v_category_summary")
      .select("*")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month)
      .eq("category_type", "despesa")
      .order("total_amount", { ascending: false })
    if (error) throw error
    return data
  },

  async getRecentTransactions(userId: string, limit = 8): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getUpcomingBills(userId: string, limit = 6): Promise<Transaction[]> {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pendente")
      .not("due_date", "is", null)
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getOverdueBills(userId: string, limit = 6): Promise<Transaction[]> {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["pendente", "atrasado"])
      .not("due_date", "is", null)
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(limit)
    if (error) throw error
    return data
  },
}
