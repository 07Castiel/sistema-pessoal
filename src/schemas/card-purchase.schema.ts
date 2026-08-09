import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")

/**
 * Formulário isolado de "compra no cartão" — deliberadamente separado de
 * transactionSchema (src/schemas/transaction.schema.ts) para não alterar o
 * formulário de Transações já testado na Fase 3. Sempre gera uma despesa
 * com account_id nulo (sem efeito de saldo — só a fatura é afetada) e
 * status "pendente" (a liquidação acontece coletivamente ao pagar a
 * fatura, não por compra individual). Ver docs/MODULO_4.md.
 */
export const cardPurchaseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "A descrição deve ter ao menos 2 caracteres")
    .max(120, "A descrição deve ter no máximo 120 caracteres"),
  amount: z
    .number({ required_error: "Informe o valor", invalid_type_error: "Informe o valor" })
    .positive("O valor deve ser maior que zero")
    .max(999_999_999, "Valor muito alto"),
  date: isoDate,
  category_id: z.string().uuid("Selecione uma categoria").nullable(),
  cost_center_id: z.string().uuid().nullable(),
  supplier: z.string().trim().max(80, "Máximo de 80 caracteres").nullable(),
  notes: z.string().trim().max(500, "Máximo de 500 caracteres").nullable(),
  tag_ids: z.array(z.string().uuid()),
})

export type CardPurchaseFormValues = z.infer<typeof cardPurchaseSchema>
