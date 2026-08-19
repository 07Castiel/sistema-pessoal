import { z } from "zod"
import { paymentMethodEnum } from "./transaction.schema"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")

const baseTransactionPaymentSchema = z.object({
  amount: z
    .number({ required_error: "Informe o valor", invalid_type_error: "Informe o valor" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  date: isoDate,
  payment_method: paymentMethodEnum.nullable(),
  notes: z.string().trim().max(500, "Máximo de 500 caracteres").nullable(),
})

/**
 * `remainingAmount` vem de fora (o saldo restante do lançamento no momento
 * em que o formulário é montado) — a validação real e definitiva contra
 * overpay é sempre a trigger `validate_transaction_payment` no banco
 * (protegida contra concorrência); este refino é só para feedback
 * imediato no formulário, com a mesma mensagem que o banco usaria.
 */
export function buildTransactionPaymentSchema(remainingAmount: number) {
  return baseTransactionPaymentSchema.superRefine((data, ctx) => {
    if (data.amount > remainingAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "O valor informado excede o saldo restante deste lançamento.",
      })
    }
  })
}

export type TransactionPaymentFormValues = z.infer<typeof baseTransactionPaymentSchema>
