import { z } from "zod"

export const CATEGORY_TYPE_OPTIONS = [
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
  { value: "transferencia", label: "Transferência" },
  { value: "investimento", label: "Investimento" },
] as const

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(60, "O nome deve ter no máximo 60 caracteres"),
  type: z.enum(["receita", "despesa", "transferencia", "investimento"]),
  icon: z.string().min(1, "Selecione um ícone"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  parent_id: z.string().uuid().nullable(),
})

export type CategoryFormValues = z.infer<typeof categorySchema>
