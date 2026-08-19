import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { transactionPaymentsService } from "@/services/transaction-payments.service"
import { useInvalidateTransactions } from "@/hooks/use-transactions"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { TransactionPaymentFormValues } from "@/schemas/transaction-payment.schema"
import type { TransactionType } from "@/types"

const KEY = "transaction-payments"

export function useTransactionPaymentsQuery(transactionId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "list", transactionId],
    queryFn: () => transactionPaymentsService.listByTransaction(transactionId!),
    enabled: !!transactionId,
  })
}

/**
 * Um pagamento muda `paid_amount`/status do lançamento, saldo de conta e
 * tudo que deriva disso — reaproveita a invalidação centralizada de
 * transações, e soma a própria lista de movimentações do lançamento
 * afetado.
 */
function useInvalidateTransactionPayments() {
  const queryClient = useQueryClient()
  const invalidateTransactions = useInvalidateTransactions()
  return (transactionId: string) => {
    queryClient.invalidateQueries({ queryKey: [KEY, "list", transactionId] })
    invalidateTransactions()
  }
}

export function useCreateTransactionPayment() {
  const { user } = useAuth()
  const invalidate = useInvalidateTransactionPayments()

  return useMutation({
    mutationFn: ({
      transactionId,
      values,
    }: {
      transactionId: string
      type: TransactionType
      values: TransactionPaymentFormValues
    }) => transactionPaymentsService.create(user!.id, transactionId, values),
    onSuccess: (_data, { transactionId, type }) => {
      invalidate(transactionId)
      toast.success(type === "receita" ? "Recebimento registrado" : "Pagamento registrado")
    },
    onError: (error) => {
      toast.error("Não foi possível registrar o pagamento", {
        description: getErrorMessage(error),
      })
    },
  })
}

export function useUpdateTransactionPayment() {
  const invalidate = useInvalidateTransactionPayments()

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string
      transactionId: string
      values: TransactionPaymentFormValues
    }) => transactionPaymentsService.update(id, values),
    onSuccess: (_data, { transactionId }) => {
      invalidate(transactionId)
      toast.success("Pagamento atualizado")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar o pagamento", {
        description: getErrorMessage(error),
      })
    },
  })
}

export function useDeleteTransactionPayment() {
  const invalidate = useInvalidateTransactionPayments()

  return useMutation({
    mutationFn: ({ id }: { id: string; transactionId: string }) =>
      transactionPaymentsService.remove(id),
    onSuccess: (_data, { transactionId }) => {
      invalidate(transactionId)
      toast.success("Pagamento excluído")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir o pagamento", {
        description: getErrorMessage(error),
      })
    },
  })
}
