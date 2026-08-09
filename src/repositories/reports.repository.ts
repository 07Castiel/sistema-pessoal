import { supabase } from "@/lib/supabase"
import type { MonthlySummary, CategorySummary, CashFlowDaily, NetWorth } from "@/types"

export const reportsRepository = {
  /**
   * Todos os meses com dado do usuário, sem filtro de período — o volume
   * por usuário é naturalmente pequeno (um app pessoal), então o range é
   * recortado no hook em vez de filtrar via múltiplas condições de
   * year/month no banco.
   */
  async getMonthlySummaries(userId: string): Promise<MonthlySummary[]> {
    const { data, error } = await supabase
      .from("v_monthly_summary")
      .select("*")
      .eq("user_id", userId)
      .order("year", { ascending: true })
      .order("month", { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async getCategorySummary(
    userId: string,
    year: number,
    month: number,
    type: "despesa" | "receita"
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
    return data ?? []
  },

  async getCashFlow(userId: string, dateFrom: string, dateTo: string): Promise<CashFlowDaily[]> {
    const { data, error } = await supabase
      .from("v_cash_flow_daily")
      .select("*")
      .eq("user_id", userId)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: true })
    if (error) throw error
    return data ?? []
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
}
