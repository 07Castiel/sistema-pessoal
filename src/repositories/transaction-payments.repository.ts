import { supabase } from "@/lib/supabase"
import type { TransactionPayment } from "@/types"
import type { TransactionPaymentFormValues } from "@/schemas/transaction-payment.schema"

export const transactionPaymentsRepository = {
  async listByTransaction(transactionId: string): Promise<TransactionPayment[]> {
    const { data, error } = await supabase
      .from("transaction_payments")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async create(
    userId: string,
    transactionId: string,
    values: TransactionPaymentFormValues
  ): Promise<TransactionPayment> {
    const { data, error } = await supabase
      .from("transaction_payments")
      .insert({
        transaction_id: transactionId,
        user_id: userId,
        amount: values.amount,
        date: values.date,
        payment_method: values.payment_method,
        notes: values.notes || null,
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, values: TransactionPaymentFormValues): Promise<TransactionPayment> {
    const { data, error } = await supabase
      .from("transaction_payments")
      .update({
        amount: values.amount,
        date: values.date,
        payment_method: values.payment_method,
        notes: values.notes || null,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("transaction_payments").delete().eq("id", id)
    if (error) throw error
  },
}
