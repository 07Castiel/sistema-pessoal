import { z } from "zod"

export const MONTH_OPTIONS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
] as const

/**
 * `budgets.category_id` não é restrito a categorias de despesa pela FK —
 * mas `check_budget_alerts` só reage a `transactions.type = 'despesa'` e
 * a "realizado" (`v_category_summary` filtrado por `category_type`) só
 * teria valor para categorias de despesa. Restringido aqui no schema/UI,
 * não no banco.
 */
export const budgetSchema = z.object({
  category_id: z.string().uuid("Selecione uma categoria"),
  month: z
    .number({ required_error: "Selecione o mês", invalid_type_error: "Selecione o mês" })
    .int()
    .min(1)
    .max(12),
  year: z
    .number({ required_error: "Selecione o ano", invalid_type_error: "Selecione o ano" })
    .int()
    .min(2000)
    .max(2100),
  planned_amount: z
    .number({ required_error: "Informe o valor planejado", invalid_type_error: "Informe o valor planejado" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
})

export type BudgetFormValues = z.infer<typeof budgetSchema>
