import { z } from "zod"

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(80, "O nome deve ter no máximo 80 caracteres"),
  avatar_url: z.string().trim().url("URL inválida").nullable(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

/**
 * `monthly_goal`/`annual_goal` são `numeric` opcionais em `profiles` —
 * sem consumidor no app antes desta sessão. `0` no `CurrencyInput`
 * significa "sem meta definida" (convertido para `null` antes de
 * gravar), mesmo padrão de `amountMin`/`amountMax` em
 * `transactions-filters.tsx`.
 */
export const financialGoalsSchema = z.object({
  monthly_goal: z.number().nonnegative("O valor não pode ser negativo").nullable(),
  annual_goal: z.number().nonnegative("O valor não pode ser negativo").nullable(),
})

export type FinancialGoalsFormValues = z.infer<typeof financialGoalsSchema>
