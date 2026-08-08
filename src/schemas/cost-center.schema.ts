import { z } from "zod"

export const costCenterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(60, "O nome deve ter no máximo 60 caracteres"),
  icon: z.string().min(1, "Selecione um ícone"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
})

export type CostCenterFormValues = z.infer<typeof costCenterSchema>
