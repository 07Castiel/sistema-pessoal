import { supabase } from "@/lib/supabase"
import type { RecurringRule } from "@/types"
import type { TransactionFormValues } from "@/schemas/transaction.schema"
import type { RecurringRuleFormValues } from "@/schemas/recurring-rule.schema"

export interface RecurringRuleStats {
  generatedCount: number
  lastOccurrenceDate: string | null
}

export const recurringRulesRepository = {
  async list(userId: string, includeInactive = true): Promise<RecurringRule[]> {
    let query = supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)

    if (!includeInactive) query = query.eq("active", true)

    const { data, error } = await query.order("next_run_date", { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async listTrashed(userId: string): Promise<RecurringRule[]> {
    const { data, error } = await supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async create(userId: string, values: RecurringRuleFormValues): Promise<RecurringRule> {
    const { data, error } = await supabase
      .from("recurring_rules")
      .insert({
        user_id: userId,
        type: values.type,
        description: values.description,
        amount: values.amount,
        category_id: values.category_id,
        account_id: values.account_id,
        cost_center_id: values.cost_center_id,
        supplier: values.supplier || null,
        payment_method: values.payment_method,
        notes: values.notes || null,
        frequency: values.frequency,
        interval_days: values.frequency === "personalizada" ? values.interval_days : null,
        start_date: values.start_date,
        end_date: values.end_date,
        next_run_date: values.start_date,
        lead_days: values.lead_days,
        active: true,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /** Edita o template da regra. Não mexe em `next_run_date` (já pode ter avançado). */
  async update(id: string, values: RecurringRuleFormValues): Promise<RecurringRule> {
    const { data, error } = await supabase
      .from("recurring_rules")
      .update({
        type: values.type,
        description: values.description,
        amount: values.amount,
        category_id: values.category_id,
        account_id: values.account_id,
        cost_center_id: values.cost_center_id,
        supplier: values.supplier || null,
        payment_method: values.payment_method,
        notes: values.notes || null,
        frequency: values.frequency,
        interval_days: values.frequency === "personalizada" ? values.interval_days : null,
        end_date: values.end_date,
        lead_days: values.lead_days,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async createFromTransactionForm(
    userId: string,
    values: TransactionFormValues
  ): Promise<RecurringRule> {
    const startDate = values.due_date ?? values.date
    const { data, error } = await supabase
      .from("recurring_rules")
      .insert({
        user_id: userId,
        type: values.type,
        description: values.description,
        amount: values.amount,
        category_id: values.category_id,
        account_id: values.account_id,
        cost_center_id: values.cost_center_id,
        supplier: values.supplier || null,
        payment_method: values.payment_method,
        notes: values.notes || null,
        frequency: values.frequency!,
        interval_days: values.frequency === "personalizada" ? values.interval_days : null,
        start_date: startDate,
        end_date: values.end_date,
        next_run_date: startDate,
        active: true,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase.from("recurring_rules").update({ active }).eq("id", id)
    if (error) throw error
  },

  /** Encerra a regra definitivamente, sem apagar o histórico gerado. */
  async end(id: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from("recurring_rules")
      .update({ active: false, end_date: today })
      .eq("id", id)
    if (error) throw error
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from("recurring_rules")
      .update({ deleted_at: new Date().toISOString(), active: false })
      .eq("id", id)
    if (error) throw error
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from("recurring_rules")
      .update({ deleted_at: null })
      .eq("id", id)
    if (error) throw error
  },

  /** Materializa as ocorrências vencidas. Idempotente. */
  async generateDue(): Promise<number> {
    const { data, error } = await supabase.rpc("generate_due_recurrences")
    if (error) throw error
    return data ?? 0
  },

  /** Quantidade gerada e data da última ocorrência, por regra. */
  async getStats(ruleIds: string[]): Promise<Record<string, RecurringRuleStats>> {
    if (ruleIds.length === 0) return {}
    const { data, error } = await supabase
      .from("transactions")
      .select("recurring_id, date")
      .in("recurring_id", ruleIds)
      .order("date", { ascending: false })
    if (error) throw error

    const stats: Record<string, RecurringRuleStats> = {}
    for (const row of data ?? []) {
      const id = row.recurring_id as string
      if (!stats[id]) {
        stats[id] = { generatedCount: 0, lastOccurrenceDate: row.date }
      }
      stats[id].generatedCount += 1
    }
    return stats
  },
}
