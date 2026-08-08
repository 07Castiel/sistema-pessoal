import { supabase } from "@/lib/supabase"
import type {
  Account,
  CategorySummary,
  MonthlySummary,
  NetWorth,
  TransactionEnriched,
} from "@/types"

export interface PendingSummary {
  payable: number
  receivable: number
  overdueExpense: number
  pendingIncome: number
}

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
    month: number,
    type: "despesa" | "receita" = "despesa"
  ): Promise<CategorySummary[]> {
    const { data, error } = await supabase
      .from("v_category_summary")
      .select("*")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month)
      .eq("category_type", type)
      .order("total_amount", { ascending: false })
    if (error) throw error
    return data
  },

  async getRecentTransactions(userId: string, limit = 8): Promise<TransactionEnriched[]> {
    const { data, error } = await supabase
      .from("v_transactions_enriched")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async getUpcomingBills(userId: string, limit = 6): Promise<TransactionEnriched[]> {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from("v_transactions_enriched")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("status", "pendente")
      .eq("is_overdue", false)
      .not("due_date", "is", null)
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async getOverdueBills(userId: string, limit = 6): Promise<TransactionEnriched[]> {
    const { data, error } = await supabase
      .from("v_transactions_enriched")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("is_overdue", true)
      .order("due_date", { ascending: true })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  /** Totais de pendências (a pagar/receber, no prazo e atrasadas) via view pré-agregada. */
  async getPendingSummary(userId: string): Promise<PendingSummary> {
    const { data, error } = await supabase
      .from("v_pending_by_due_date")
      .select("type, is_overdue, total")
      .eq("user_id", userId)
    if (error) throw error

    const summary: PendingSummary = { payable: 0, receivable: 0, overdueExpense: 0, pendingIncome: 0 }
    for (const row of data ?? []) {
      const total = Number(row.total)
      if (row.type === "despesa") {
        summary.payable += total
        if (row.is_overdue) summary.overdueExpense += total
      } else if (row.type === "receita") {
        summary.receivable += total
        if (!row.is_overdue) summary.pendingIncome += total
      }
    }
    return summary
  },
}
