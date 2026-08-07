import { supabase } from "@/lib/supabase"
import type { Account, AccountReconciliation, AccountStatus, AccountType } from "@/types"
import type { AccountFormValues } from "@/schemas/account.schema"

export interface AccountListFilters {
  search?: string
  type?: AccountType | "todos"
  status?: AccountStatus | "todos"
  trashed?: boolean
  sortBy?: "name" | "current_balance" | "created_at"
  sortDir?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export interface AccountListResult {
  data: Account[]
  count: number
}

export const accountsRepository = {
  async list(userId: string, filters: AccountListFilters): Promise<AccountListResult> {
    const {
      search,
      type = "todos",
      status = "todos",
      trashed = false,
      sortBy = "created_at",
      sortDir = "asc",
      page = 1,
      pageSize = 12,
    } = filters

    let query = supabase
      .from("accounts")
      .select("*", { count: "exact" })
      .eq("user_id", userId)

    query = trashed ? query.not("deleted_at", "is", null) : query.is("deleted_at", null)

    if (type !== "todos") query = query.eq("type", type)
    if (status !== "todos") query = query.eq("status", status)
    if (search && search.trim()) {
      const term = `%${search.trim()}%`
      query = query.or(`name.ilike.${term},bank.ilike.${term}`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortDir === "asc" })
      .range(from, to)

    if (error) throw error
    return { data: data ?? [], count: count ?? 0 }
  },

  async getById(id: string): Promise<Account | null> {
    const { data, error } = await supabase.from("accounts").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data
  },

  async create(userId: string, values: AccountFormValues): Promise<Account> {
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
        name: values.name,
        bank: values.bank || null,
        type: values.type,
        color: values.color,
        icon: values.icon,
        initial_balance: values.initial_balance,
        current_balance: values.initial_balance,
        status: values.status,
      })
      .select("*")
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, values: AccountFormValues): Promise<Account> {
    const { data, error } = await supabase
      .from("accounts")
      .update({
        name: values.name,
        bank: values.bank || null,
        type: values.type,
        color: values.color,
        icon: values.icon,
        status: values.status,
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) throw error
    return data
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from("accounts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase.from("accounts").update({ deleted_at: null }).eq("id", id)
    if (error) throw error
  },

  async reconcile(
    accountId: string,
    statementBalance: number,
    notes?: string
  ): Promise<AccountReconciliation> {
    const { data, error } = await supabase.rpc("reconcile_account", {
      p_account_id: accountId,
      p_statement_balance: statementBalance,
      p_notes: notes || undefined,
    })
    if (error) throw error
    return data
  },

  async listReconciliations(accountId: string): Promise<AccountReconciliation[]> {
    const { data, error } = await supabase
      .from("account_reconciliations")
      .select("*")
      .eq("account_id", accountId)
      .order("reconciled_at", { ascending: false })
    if (error) throw error
    return data
  },

  async countActiveAccounts(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null)
    if (error) throw error
    return count ?? 0
  },
}
