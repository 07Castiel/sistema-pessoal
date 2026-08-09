import { z } from "zod"

export const LOAN_TYPE_OPTIONS = [
  { value: "recebido", label: "Peguei emprestado" },
  { value: "concedido", label: "Emprestei" },
] as const

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")

/**
 * Empréstimo simples (pessoa física, sem sistema de amortização) —
 * `loan_installments` não tem `interest_amount`/`amortization_amount`,
 * diferente de `financing_installments`. `installment_amount` é o valor
 * de cada parcela, informado pelo usuário (o acordo real entre as
 * partes), não calculado — schema não tem `interest_rate` por parcela.
 */
export const loanSchema = z.object({
  person_name: z
    .string()
    .trim()
    .min(2, "Informe o nome da pessoa")
    .max(60, "Máximo de 60 caracteres"),
  type: z.enum(["recebido", "concedido"]),
  principal_amount: z
    .number({ required_error: "Informe o valor principal" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  installments_total: z
    .number({ required_error: "Informe o número de parcelas" })
    .int("Informe um número inteiro")
    .min(1, "Ao menos 1 parcela")
    .max(480, "Máximo de 480 parcelas"),
  installment_amount: z
    .number({ required_error: "Informe o valor da parcela" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  start_date: isoDate,
  account_id: z.string().uuid().nullable(),
  notes: z.string().trim().max(500, "Máximo de 500 caracteres").nullable(),
})

export type LoanFormValues = z.infer<typeof loanSchema>
