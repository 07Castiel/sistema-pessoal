import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { transactionsService } from "@/services/transactions.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { TransactionFormValues } from "@/schemas/transaction.schema"
import type { TransactionListFilters } from "@/repositories/transactions.repository"
import type { Transaction } from "@/types"

const KEY = "transactions"

/**
 * Um lançamento altera saldo de conta, KPIs do dashboard e a própria
 * listagem. Centralizar a invalidação evita esquecer alguma superfície
 * e evita invalidar o app inteiro.
 */
function useInvalidateTransactions() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["accounts"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["recurring-rules"] })
    queryClient.invalidateQueries({ queryKey: ["budgets"] })
  }
}

export function useTransactionsQuery(filters: TransactionListFilters) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "list", user?.id, filters],
    queryFn: () => transactionsService.list(user!.id, filters),
    enabled: !!user,
    placeholderData: keepPreviousData,
  })
}

export function useTransactionTotals(filters: TransactionListFilters) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "totals", user?.id, filters.dateFrom, filters.dateTo, filters.accountId],
    queryFn: () => transactionsService.totals(user!.id, filters),
    enabled: !!user,
    placeholderData: keepPreviousData,
  })
}

export function useTrashedTransactionsCount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "trashed-count", user?.id],
    queryFn: () => transactionsService.countTrashed(user!.id),
    enabled: !!user,
  })
}

export function useCreateTransaction() {
  const { user } = useAuth()
  const invalidate = useInvalidateTransactions()

  return useMutation({
    mutationFn: (values: TransactionFormValues) => transactionsService.create(user!.id, values),
    onSuccess: (_data, values) => {
      invalidate()
      const label = values.type === "receita" ? "Receita" : "Despesa"
      if (values.repeat === "installments") {
        toast.success(`${label} parcelada em ${values.installments}x criada!`)
      } else if (values.repeat === "recurring") {
        toast.success(`Recorrência de ${label.toLowerCase()} criada!`)
      } else {
        toast.success(`${label} criada com sucesso!`)
      }
    },
    onError: (error) => {
      toast.error("Não foi possível salvar o lançamento", {
        description: getErrorMessage(error),
      })
    },
  })
}

export function useUpdateTransaction() {
  const { user } = useAuth()
  const invalidate = useInvalidateTransactions()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: TransactionFormValues }) =>
      transactionsService.update(id, user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Lançamento atualizado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar o lançamento", {
        description: getErrorMessage(error),
      })
    },
  })
}

export function useSetTransactionStatus() {
  const invalidate = useInvalidateTransactions()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Transaction["status"] }) =>
      transactionsService.setStatus(id, status),
    onSuccess: (_data, { status }) => {
      invalidate()
      const messages: Record<string, string> = {
        recebido: "Receita marcada como recebida",
        pago: "Despesa marcada como paga",
        pendente: "Lançamento voltou para pendente",
        cancelado: "Lançamento cancelado",
      }
      toast.success(messages[status] ?? "Status atualizado")
    },
    onError: (error) => {
      toast.error("Não foi possível alterar o status", {
        description: getErrorMessage(error),
      })
    },
  })
}

export function useSoftDeleteTransaction() {
  const invalidate = useInvalidateTransactions()

  return useMutation({
    mutationFn: (id: string) => transactionsService.softDelete(id),
    onSuccess: () => {
      invalidate()
      toast.success("Lançamento movido para a lixeira")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir o lançamento", {
        description: getErrorMessage(error),
      })
    },
  })
}

export function useRestoreTransaction() {
  const invalidate = useInvalidateTransactions()

  return useMutation({
    mutationFn: (id: string) => transactionsService.restore(id),
    onSuccess: () => {
      invalidate()
      toast.success("Lançamento restaurado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível restaurar o lançamento", {
        description: getErrorMessage(error),
      })
    },
  })
}

export function useDeleteInstallmentGroup() {
  const invalidate = useInvalidateTransactions()

  return useMutation({
    mutationFn: (groupId: string) => transactionsService.softDeleteInstallmentGroup(groupId),
    onSuccess: () => {
      invalidate()
      toast.success("Parcelas pendentes movidas para a lixeira")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir as parcelas", {
        description: getErrorMessage(error),
      })
    },
  })
}
