import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")

/**
 * `paid_amount` já existe separado de `amount` no schema de
 * `loan_installments`/`financing_installments`, e `recalc_loan_balance`/
 * `recalc_financing_balance` calculam `remaining_balance` como
 * `sum(amount - paid_amount)` — o schema já suporta pagamento parcial.
 * O valor informado aqui é somado ao `paid_amount` já registrado
 * (incremental), não substitui — permite múltiplos pagamentos parciais
 * na mesma parcela sem perder o que já foi pago.
 */
export const installmentPaymentSchema = z.object({
  amount: z
    .number({ required_error: "Informe o valor pago" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  paid_date: isoDate,
})

export type InstallmentPaymentFormValues = z.infer<typeof installmentPaymentSchema>
