import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cardInvoicesService } from "@/services/card-invoices.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { CardPurchaseFormValues } from "@/schemas/card-purchase.schema"
import type { CreditCard } from "@/types"

const KEY = "card-invoices"

function useInvalidateCardInvoices() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["credit-cards"] }) // limite usado/disponível (v_card_usage)
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
    queryClient.invalidateQueries({ queryKey: ["accounts"] }) // pagamento de fatura afeta saldo
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["reports"] })
    queryClient.invalidateQueries({ queryKey: ["calendar"] })
  }
}

export function useCardInvoicesQuery(cardId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "list", cardId],
    queryFn: () => cardInvoicesService.listByCard(cardId!),
    enabled: !!cardId,
  })
}

export function useInvoiceTransactionsQuery(invoiceId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "transactions", invoiceId],
    queryFn: () => cardInvoicesService.listTransactions(invoiceId!),
    enabled: !!invoiceId,
  })
}

export function useCreateCardPurchase() {
  const { user } = useAuth()
  const invalidate = useInvalidateCardInvoices()

  return useMutation({
    mutationFn: ({ card, values }: { card: CreditCard; values: CardPurchaseFormValues }) =>
      cardInvoicesService.createPurchase(user!.id, card, values),
    onSuccess: () => {
      invalidate()
      toast.success("Compra lançada na fatura!")
    },
    onError: (error) => {
      toast.error("Não foi possível lançar a compra", { description: getErrorMessage(error) })
    },
  })
}

export function usePayInvoice() {
  const { user } = useAuth()
  const invalidate = useInvalidateCardInvoices()

  return useMutation({
    mutationFn: ({
      card,
      invoiceId,
      accountId,
      totalAmount,
    }: {
      card: CreditCard
      invoiceId: string
      accountId: string
      totalAmount: number
    }) => cardInvoicesService.payInvoice(user!.id, card, invoiceId, accountId, totalAmount),
    onSuccess: () => {
      invalidate()
      toast.success("Fatura paga com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível pagar a fatura", { description: getErrorMessage(error) })
    },
  })
}
