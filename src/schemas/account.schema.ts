import { z } from "zod"

export const ACCOUNT_TYPE_OPTIONS = [
  { value: "carteira", label: "Carteira" },
  { value: "banco", label: "Banco" },
  { value: "caixa", label: "Caixa" },
  { value: "conta_corrente", label: "Conta Corrente" },
  { value: "conta_poupanca", label: "Conta Poupança" },
  { value: "conta_digital", label: "Conta Digital" },
  { value: "investimentos", label: "Investimentos" },
  { value: "conta_internacional", label: "Conta Internacional" },
] as const

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(60, "O nome deve ter no máximo 60 caracteres"),
  bank: z
    .string()
    .trim()
    .max(60, "O banco deve ter no máximo 60 caracteres")
    .optional()
    .or(z.literal("")),
  type: z.enum([
    "carteira",
    "banco",
    "caixa",
    "conta_corrente",
    "conta_poupanca",
    "conta_digital",
    "investimentos",
    "conta_internacional",
  ]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  icon: z.string().min(1, "Selecione um ícone"),
  initial_balance: z
    .number({
      required_error: "Informe o saldo inicial",
      invalid_type_error: "Informe o saldo inicial",
    })
    .finite("Valor inválido")
    .max(999_999_999, "Valor muito alto"),
  status: z.enum(["ativa", "inativa", "arquivada"]),
})

export type AccountFormValues = z.infer<typeof accountSchema>

export const reconcileAccountSchema = z.object({
  statement_balance: z
    .number({
      required_error: "Informe o saldo do extrato",
      invalid_type_error: "Informe o saldo do extrato",
    })
    .finite("Valor inválido"),
  notes: z.string().trim().max(280, "Máximo de 280 caracteres").optional().or(z.literal("")),
})

export type ReconcileAccountFormValues = z.infer<typeof reconcileAccountSchema>
