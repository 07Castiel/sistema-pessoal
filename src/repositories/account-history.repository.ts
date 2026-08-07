import { supabase } from "@/lib/supabase"
import type { Transaction, Transfer } from "@/types"

export const accountHistoryRepository = {
  async listTransactions(accountId: string, limit = 50): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("account_id", accountId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async listTransfers(accountId: string, limit = 50): Promise<Transfer[]> {
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      .order("date", { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },
}
