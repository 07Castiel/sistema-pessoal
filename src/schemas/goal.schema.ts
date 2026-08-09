import { z } from "zod"

export const PRIORITY_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
] as const

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")

export const goalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(60, "O nome deve ter no máximo 60 caracteres"),
  target_amount: z
    .number({ required_error: "Informe o valor da meta", invalid_type_error: "Informe o valor da meta" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  target_date: isoDate.nullable(),
  priority: z.enum(["baixa", "media", "alta"]),
  category_id: z.string().uuid().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  icon: z.string().min(1, "Selecione um ícone"),
})

export type GoalFormValues = z.infer<typeof goalSchema>

/**
 * `goal_contributions.amount` não tem CHECK de sinal no banco — aporte é
 * positivo, retirada é gravada como valor negativo. `kind` só existe no
 * frontend para a UI; o banco não tem coluna de tipo (diferente de
 * investment_movements, que tem `type`).
 */
export const goalContributionSchema = z.object({
  kind: z.enum(["aporte", "retirada"]),
  amount: z
    .number({ required_error: "Informe o valor", invalid_type_error: "Informe o valor" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  date: isoDate,
  notes: z.string().trim().max(280, "Máximo de 280 caracteres").nullable(),
})

export type GoalContributionFormValues = z.infer<typeof goalContributionSchema>
