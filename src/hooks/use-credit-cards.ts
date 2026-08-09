import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { creditCardsService } from "@/services/credit-cards.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { CreditCardFormValues } from "@/schemas/credit-card.schema"
import type { CreditCard } from "@/types"

const KEY = "credit-cards"

/**
 * Excluir/editar um cartão pode desvincular transações existentes
 * (`card_id`/`invoice_id` viram null por ON DELETE SET NULL) — por isso
 * "transactions" também é invalidado aqui, no mesmo espírito de
 * useInvalidateTransactions em use-transactions.ts.
 */
function useInvalidateCreditCards() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["card-invoices"] })
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
  }
}

export function useCreditCardsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "list", user?.id],
    queryFn: () => creditCardsService.list(user!.id),
    enabled: !!user,
  })
}

export function useCardUsageQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "usage", user?.id],
    queryFn: () => creditCardsService.usage(user!.id),
    enabled: !!user,
  })
}

export function useCreateCreditCard() {
  const { user } = useAuth()
  const invalidate = useInvalidateCreditCards()

  return useMutation({
    mutationFn: (values: CreditCardFormValues) => creditCardsService.create(user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Cartão criado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar o cartão", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateCreditCard() {
  const invalidate = useInvalidateCreditCards()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: CreditCardFormValues }) =>
      creditCardsService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Cartão atualizado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar o cartão", { description: getErrorMessage(error) })
    },
  })
}

export function useSetCreditCardStatus() {
  const invalidate = useInvalidateCreditCards()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CreditCard["status"] }) =>
      creditCardsService.setStatus(id, status),
    onSuccess: (_data, { status }) => {
      invalidate()
      toast.success(status === "arquivada" ? "Cartão arquivado" : "Cartão reativado")
    },
    onError: (error) => {
      toast.error("Não foi possível alterar o cartão", { description: getErrorMessage(error) })
    },
  })
}

export function useDeleteCreditCard() {
  const invalidate = useInvalidateCreditCards()

  return useMutation({
    mutationFn: (id: string) => creditCardsService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Cartão excluído")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir o cartão", { description: getErrorMessage(error) })
    },
  })
}
