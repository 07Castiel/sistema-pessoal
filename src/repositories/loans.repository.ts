import { supabase } from "@/lib/supabase"
import type { Loan, LoanInstallment } from "@/types"
import type { LoanFormValues } from "@/schemas/loan.schema"
import { buildLoanSchedule } from "@/lib/financing-schedule"

export const loansRepository = {
  async list(userId: string): Promise<Loan[]> {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Loan | null> {
    const { data, error } = await supabase.from("loans").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    return data
  },

  /**
   * Cria o empréstimo e já materializa as N parcelas (não existe RPC para
   * isso). Duas operações sequenciais, não atômicas — se a segunda falhar,
   * o empréstimo fica sem parcelas (ver docs/MODULO_4.md, limitação
   * conhecida, mesmo padrão já registrado para o pagamento de fatura de
   * cartão).
   */
  async create(userId: string, values: LoanFormValues): Promise<Loan> {
    const { data: loan, error } = await supabase
      .from("loans")
      .insert({
        user_id: userId,
        person_name: values.person_name,
        type: values.type,
        principal_amount: values.principal_amount,
        installments_total: values.installments_total,
        installment_amount: values.installment_amount,
        remaining_balance: values.installment_amount * values.installments_total,
        start_date: values.start_date,
        account_id: values.account_id,
        notes: values.notes || null,
      })
      .select("*")
      .single()
    if (error) throw error

    const schedule = buildLoanSchedule(values.start_date, values.installments_total, values.installment_amount)
    const { error: installmentsError } = await supabase.from("loan_installments").insert(
      schedule.map((row) => ({
        user_id: userId,
        loan_id: loan.id,
        number: row.number,
        due_date: row.dueDate,
        amount: row.amount,
      }))
    )
    if (installmentsError) throw installmentsError

    return loan
  },

  /** Só metadados — mudar principal/parcelas exigiria regenerar todo o
   * cronograma; não suportado nesta primeira versão (ver pendências). */
  async update(id: string, values: LoanFormValues): Promise<Loan> {
    const { data, error } = await supabase
      .from("loans")
      .update({
        person_name: values.person_name,
        type: values.type,
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
   * `loan_installments.loan_id` é ON DELETE CASCADE. */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("loans").delete().eq("id", id)
    if (error) throw error
  },

  async listInstallments(loanId: string): Promise<LoanInstallment[]> {
    const { data, error } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loanId)
      .order("number", { ascending: true })
    if (error) throw error
    return data ?? []
  },

  /** Pagamento incremental: soma ao `paid_amount` já registrado; marca
   * `pago` quando o total atinge o valor da parcela. */
  async payInstallment(id: string, amount: number, paidDate: string): Promise<void> {
    const { data: current, error: fetchError } = await supabase
      .from("loan_installments")
      .select("amount, paid_amount")
      .eq("id", id)
      .single()
    if (fetchError) throw fetchError

    const newPaidAmount = Number(current.paid_amount) + amount
    const isFullyPaid = newPaidAmount >= Number(current.amount)

    const { error } = await supabase
      .from("loan_installments")
      .update({
        paid_amount: newPaidAmount,
        paid_date: paidDate,
        status: isFullyPaid ? "pago" : "pendente",
      })
      .eq("id", id)
    if (error) throw error
  },

  /**
   * Marca como "atrasado" as parcelas pendentes vencidas — não existe
   * trigger nem job que faça isso automaticamente (diferente de
   * transações, onde "atrasado" é sempre derivado e nunca gravado; aqui
   * não há trigger bloqueando a escrita, e `recalc_loan_balance` lê o
   * status gravado). Chamado sob demanda antes de listar, mesmo espírito
   * de `generate_due_recurrences`. Decisão de implementação, documentada.
   */
  async syncOverdue(userId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from("loan_installments")
      .update({ status: "atrasado" })
      .eq("user_id", userId)
      .eq("status", "pendente")
      .lt("due_date", today)
    if (error) throw error
  },
}
