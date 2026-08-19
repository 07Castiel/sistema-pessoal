import { z } from "zod"

export const PAYMENT_METHOD_OPTIONS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
] as const

export const RECURRENCE_FREQUENCY_OPTIONS = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
  { value: "personalizada", label: "Personalizada" },
] as const

export const paymentMethodEnum = z.enum([
  "dinheiro",
  "debito",
  "credito",
  "pix",
  "boleto",
  "transferencia",
  "outro",
])

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")

const optionalUuid = z.string().uuid().nullable()

/**
 * Um único schema para receita e despesa: a distinção é o campo `type`.
 * `repeat` decide se o lançamento é único, parcelado ou recorrente.
 */
export const transactionSchema = z
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
    cost_center_id: optionalUuid,
    date: isoDate,
    due_date: isoDate.nullable(),
    settled: z.boolean(),
    supplier: z.string().trim().max(80, "Máximo de 80 caracteres").nullable(),
    payment_method: paymentMethodEnum.nullable(),
    notes: z.string().trim().max(500, "Máximo de 500 caracteres").nullable(),
    tag_ids: z.array(z.string().uuid()),

    repeat: z.enum(["none", "installments", "recurring"]),
    installments: z
      .number()
      .int("Informe um número inteiro")
      .min(2, "Um parcelamento precisa de ao menos 2 parcelas")
      .max(480, "Máximo de 480 parcelas")
      .nullable(),
    frequency: z
      .enum([
        "semanal",
        "quinzenal",
        "mensal",
        "bimestral",
        "trimestral",
        "semestral",
        "anual",
        "personalizada",
      ])
      .nullable(),
    interval_days: z
      .number()
      .int("Informe um número inteiro")
      .min(1, "O intervalo deve ser de ao menos 1 dia")
      .max(365, "Máximo de 365 dias")
      .nullable(),
    end_date: isoDate.nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.repeat === "installments" && !data.installments) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installments"],
        message: "Informe o número de parcelas",
      })
    }
    if (data.repeat === "recurring") {
      if (!data.frequency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["frequency"],
          message: "Selecione a frequência",
        })
      }
      if (data.frequency === "personalizada" && !data.interval_days) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["interval_days"],
          message: "Informe o intervalo em dias",
        })
      }
    }
    if (data.due_date && data.due_date < data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["due_date"],
        message: "O vencimento não pode ser anterior à data do lançamento",
      })
    }
    if (data.end_date && data.end_date < data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "O término não pode ser anterior à data do lançamento",
      })
    }
    // Parcelamento e recorrência já nascem pendentes: cada ocorrência é
    // liquidada individualmente.
    if (data.repeat !== "none" && data.settled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["settled"],
        message: "Parcelamentos e recorrências são criados como pendentes",
      })
    }
  })

export type TransactionFormValues = z.infer<typeof transactionSchema>
