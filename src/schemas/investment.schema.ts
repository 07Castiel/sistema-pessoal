import { z } from "zod"

/**
 * `investments` não tem colunas `color`/`icon` (diferente de contas,
 * cartões, metas, centros de custo) — a aparência é derivada do `type`,
 * não personalizável pelo usuário.
 */
export const INVESTMENT_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  tesouro: { label: "Tesouro Direto", icon: "landmark", color: "#0ea5e9" },
  cdb: { label: "CDB", icon: "banknote", color: "#6366f1" },
  lci: { label: "LCI", icon: "home", color: "#22c55e" },
  lca: { label: "LCA", icon: "briefcase", color: "#84cc16" },
  fundos: { label: "Fundos", icon: "briefcase", color: "#a855f7" },
  acoes: { label: "Ações", icon: "trending-up", color: "#ef4444" },
  fiis: { label: "Fundos Imobiliários", icon: "building-2", color: "#f97316" },
  etfs: { label: "ETFs", icon: "target", color: "#0ea5e9" },
  cripto: { label: "Criptomoedas", icon: "coins", color: "#f59e0b" },
  exterior: { label: "Exterior", icon: "globe", color: "#64748b" },
}

export const INVESTMENT_TYPE_OPTIONS = Object.entries(INVESTMENT_TYPE_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")

export const investmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(60, "O nome deve ter no máximo 60 caracteres"),
  type: z.enum(["tesouro", "cdb", "lci", "lca", "fundos", "acoes", "fiis", "etfs", "cripto", "exterior"]),
  institution: z.string().trim().max(60, "Máximo de 60 caracteres").nullable(),
  application_date: isoDate,
  maturity_date: isoDate.nullable(),
  liquidity: z.string().trim().max(40, "Máximo de 40 caracteres").nullable(),
  rate_description: z.string().trim().max(80, "Máximo de 80 caracteres").nullable(),
  account_id: z.string().uuid().nullable(),
  notes: z.string().trim().max(500, "Máximo de 500 caracteres").nullable(),
})

export type InvestmentFormValues = z.infer<typeof investmentSchema>

export const MOVEMENT_TYPE_OPTIONS = [
  { value: "aporte", label: "Aporte" },
  { value: "resgate", label: "Resgate" },
  { value: "rendimento", label: "Rendimento" },
] as const

/**
 * `amount` é sempre uma magnitude positiva no banco — o sinal do efeito
 * em `current_amount` vem de `type` (aplicado por `apply_investment_movement`,
 * não replicado aqui). Diferente de `goal_contributions`, que não tem
 * coluna de tipo e usa o próprio sinal do valor.
 */
export const investmentMovementSchema = z.object({
  type: z.enum(["aporte", "resgate", "rendimento"]),
  amount: z
    .number({ required_error: "Informe o valor", invalid_type_error: "Informe o valor" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  date: isoDate,
  notes: z.string().trim().max(280, "Máximo de 280 caracteres").nullable(),
})

export type InvestmentMovementFormValues = z.infer<typeof investmentMovementSchema>
