import { cardInvoicesRepository } from "@/repositories/card-invoices.repository"
import { transactionsRepository } from "@/repositories/transactions.repository"
import { resolveInvoicePeriod } from "@/lib/card-invoice"
import type { CreditCard } from "@/types"
import type { CardPurchaseFormValues } from "@/schemas/card-purchase.schema"

/**
 * Encontra a fatura do cartão para a data da compra; cria se ainda não
 * existir (find-or-create sobre a UNIQUE(card_id, reference_month)).
 * Não é RPC nem trigger — não existe nenhuma no banco para isso; é
 * decisão de implementação da Fase 4, documentada em docs/MODULO_4.md.
 */
async function resolveInvoiceId(
  userId: string,
  card: CreditCard,
  purchaseDate: string
): Promise<string> {
  const period = resolveInvoicePeriod(purchaseDate, card.closing_day, card.due_day)
  const existing = await cardInvoicesRepository.findByCardAndMonth(card.id, period.referenceMonth)
  if (existing) return existing.id
  const created = await cardInvoicesRepository.create(userId, card.id, period)
  return created.id
}

export const cardInvoicesService = {
  listByCard: cardInvoicesRepository.listByCard,
  listTransactions: cardInvoicesRepository.listTransactions,
  resolveInvoiceId,

  async createPurchase(userId: string, card: CreditCard, values: CardPurchaseFormValues) {
    const invoiceId = await resolveInvoiceId(userId, card, values.date)
    return transactionsRepository.createCardPurchase(userId, card.id, invoiceId, values)
  },

  /**
   * Cria a transação de pagamento primeiro (efeito real de saldo); só
   * marca a fatura como paga se a transação foi criada com sucesso —
   * evita marcar "paga" uma fatura cujo pagamento não foi efetivamente
   * registrado.
   */
  async payInvoice(
    userId: string,
    card: CreditCard,
    invoiceId: string,
    accountId: string,
    totalAmount: number
  ) {
    await transactionsRepository.createInvoiceSettlement(
      userId,
      card.id,
      accountId,
      totalAmount,
      `Pagamento fatura ${card.name}`
    )
    await cardInvoicesRepository.markAsPaid(invoiceId, accountId)
  },
}
