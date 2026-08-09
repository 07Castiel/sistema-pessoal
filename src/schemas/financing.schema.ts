import { z } from "zod"

export const AMORTIZATION_OPTIONS = [
  { value: "price", label: "Price (parcelas fixas)" },
  { value: "sac", label: "SAC (amortização constante)" },
] as const

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")

/**
 * `interest_rate` é tratado como percentual por período (ex.: 1,5 = 1,5%
 * ao mês) — decisão de implementação documentada em docs/MODULO_4.md,
 * não determinável só pelo schema (`numeric(7,4)`, sem unidade
 * explícita). Periodicidade assumida mensal.
 */
export const financingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(60, "Máximo de 60 caracteres"),
  amortization: z.enum(["sac", "price"]),
  principal_amount: z
    .number({ required_error: "Informe o valor financiado" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  interest_rate: z
    .number({ required_error: "Informe a taxa de juros" })
    .min(0, "A taxa não pode ser negativa")
    .max(100, "Taxa muito alta — informe em % ao mês (ex.: 1.5)"),
  installments_total: z
    .number({ required_error: "Informe o número de parcelas" })
    .int("Informe um número inteiro")
    .min(1, "Ao menos 1 parcela")
    .max(480, "Máximo de 480 parcelas"),
  start_date: isoDate,
  account_id: z.string().uuid().nullable(),
  notes: z.string().trim().max(500, "Máximo de 500 caracteres").nullable(),
})

export type FinancingFormValues = z.infer<typeof financingSchema>
