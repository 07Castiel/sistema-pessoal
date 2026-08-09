import { z } from "zod"

export const CARD_BRAND_OPTIONS = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "American Express" },
  { value: "hipercard", label: "Hipercard" },
  { value: "outro", label: "Outro" },
] as const

export const creditCardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(60, "O nome deve ter no máximo 60 caracteres"),
  bank: z.string().trim().max(60, "O banco deve ter no máximo 60 caracteres").nullable(),
  brand: z.enum(["visa", "mastercard", "elo", "amex", "hipercard", "outro"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  icon: z.string().min(1, "Selecione um ícone"),
  credit_limit: z
    .number({ required_error: "Informe o limite", invalid_type_error: "Informe o limite" })
    .positive("O limite deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  closing_day: z
    .number({ required_error: "Informe o dia de fechamento" })
    .int("Informe um número inteiro")
    .min(1, "Entre 1 e 31")
    .max(31, "Entre 1 e 31"),
  due_day: z
    .number({ required_error: "Informe o dia de vencimento" })
    .int("Informe um número inteiro")
    .min(1, "Entre 1 e 31")
    .max(31, "Entre 1 e 31"),
  account_id: z.string().uuid().nullable(),
  status: z.enum(["ativa", "inativa", "arquivada"]),
})

export type CreditCardFormValues = z.infer<typeof creditCardSchema>
