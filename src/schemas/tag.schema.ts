import { z } from "zod"

export const tagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(40, "O nome deve ter no máximo 40 caracteres"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
})

export type TagFormValues = z.infer<typeof tagSchema>
