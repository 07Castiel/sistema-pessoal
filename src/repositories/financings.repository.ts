import { supabase } from "@/lib/supabase"
import type { Financing, FinancingInstallment } from "@/types"
import type { FinancingFormValues } from "@/schemas/financing.schema"
import { buildFinancingSchedule } from "@/lib/financing-schedule"

export const financingsRepository = {
  async list(userId: string): Promise<Financing[]> {
    const { data, error } = await supabase
      .from("financings")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Financing | null> {
    const { data, error } = await supabase.from("financings").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data
  },

  /**
   * Cria o financiamento e materializa o cronograma SAC/Price (não existe
   * RPC para isso). Duas operações sequenciais, não atômicas — mesma
   * limitação conhecida de `loans.create` (ver docs/MODULO_4.md).
   */
  async create(userId: string, values: FinancingFormValues): Promise<Financing> {
    const { data: financing, error } = await supabase
      .from("financings")
      .insert({
        user_id: userId,
        name: values.name,
        amortization: values.amortization,
        principal_amount: values.principal_amount,
        interest_rate: values.interest_rate,
        installments_total: values.installments_total,
        remaining_balance: values.principal_amount,
        start_date: values.start_date,
        account_id: values.account_id,
        notes: values.notes || null,
      })
      .select("*")
      .single()
    if (error) throw error

    const schedule = buildFinancingSchedule(
      values.amortization,
      values.start_date,
      values.principal_amount,
      values.interest_rate,
      values.installments_total
    )
    const { error: installmentsError } = await supabase.from("financing_installments").insert(
      schedule.map((row) => ({
        user_id: userId,
        financing_id: financing.id,
        number: row.number,
        due_date: row.dueDate,
        amount: row.amount,
        amortization_amount: row.amortizationAmount,
        interest_amount: row.interestAmount,
        remaining_balance: row.remainingBalance,
      }))
    )
    if (installmentsError) throw installmentsError

    return financing
  },

  /** Só metadados — mudar principal/taxa/parcelas exigiria regenerar todo
   * o cronograma; não suportado nesta primeira versão. */
  async update(id: string, values: FinancingFormValues): Promise<Financing> {
    const { data, error } = await supabase
      .from("financings")
      .update({
        name: values.name,
        account_id: values.account_id,
        notes: values.notes || null,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /** Exclusão física — sem `deleted_at` nesta tabela. Segura:
   * `financing_installments.financing_id` é ON DELETE CASCADE. */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("financings").delete().eq("id", id)
    if (error) throw error
  },

  async listInstallments(financingId: string): Promise<FinancingInstallment[]> {
    const { data, error } = await supabase
      .from("financing_installments")
      .select("*")
      .eq("financing_id", financingId)
      .order("number", { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async payInstallment(id: string, amount: number, paidDate: string): Promise<void> {
    const { data: current, error: fetchError } = await supabase
      .from("financing_installments")
      .select("amount, paid_amount")
      .eq("id", id)
      .single()
    if (fetchError) throw fetchError

    const newPaidAmount = Number(current.paid_amount) + amount
    const isFullyPaid = newPaidAmount >= Number(current.amount)

    const { error } = await supabase
      .from("financing_installments")
      .update({
        paid_amount: newPaidAmount,
        paid_date: paidDate,
        status: isFullyPaid ? "pago" : "pendente",
      })
      .eq("id", id)
    if (error) throw error
  },

  /** Mesmo espírito de `loansRepository.syncOverdue` — ver comentário lá. */
  async syncOverdue(userId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from("financing_installments")
      .update({ status: "atrasado" })
      .eq("user_id", userId)
      .eq("status", "pendente")
      .lt("due_date", today)
    if (error) throw error
  },
}
