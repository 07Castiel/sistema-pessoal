import { z } from "zod"

const paymentMethodEnum = z.enum([
  "dinheiro",
  "debito",
  "credito",
  "pix",
  "boleto",
  "transferencia",
  "outro",
])

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")

export const recurringRuleSchema = z
  .object({
    type: z.enum(["receita", "despesa"]),
    description: z
      .string()
      .trim()
      .min(2, "A descrição deve ter ao menos 2 caracteres")
      .max(120, "A descrição deve ter no máximo 120 caracteres"),
    amount: z
      .number({
        required_error: "Informe o valor",
        invalid_type_error: "Informe o valor",
      })
      .positive("O valor deve ser maior que zero")
      .max(999_999_999, "Valor muito alto"),
    account_id: z.string().uuid("Selecione uma conta"),
    category_id: z.string().uuid("Selecione uma categoria"),
    cost_center_id: z.string().uuid().nullable(),
    supplier: z.string().trim().max(80, "Máximo de 80 caracteres").nullable(),
    payment_method: paymentMethodEnum.nullable(),
    notes: z.string().trim().max(500, "Máximo de 500 caracteres").nullable(),

    frequency: z.enum([
      "semanal",
      "quinzenal",
      "mensal",
      "bimestral",
      "trimestral",
      "semestral",
      "anual",
      "personalizada",
    ]),
    interval_days: z
      .number()
      .int("Informe um número inteiro")
      .min(1, "O intervalo deve ser de ao menos 1 dia")
      .max(365, "Máximo de 365 dias")
      .nullable(),
    start_date: isoDate,
    end_date: isoDate.nullable(),
    lead_days: z
      .number()
      .int("Informe um número inteiro")
      .min(0, "Não pode ser negativo")
      .max(30, "Máximo de 30 dias"),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "personalizada" && !data.interval_days) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interval_days"],
        message: "Informe o intervalo em dias",
      })
    }
    if (data.end_date && data.end_date < data.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "O término não pode ser anterior ao início",
      })
    }
  })

export type RecurringRuleFormValues = z.infer<typeof recurringRuleSchema>
