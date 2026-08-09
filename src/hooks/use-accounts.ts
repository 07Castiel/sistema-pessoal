import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { accountsService } from "@/services/accounts.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { AccountFormValues } from "@/schemas/account.schema"
import type { AccountListFilters } from "@/repositories/accounts.repository"

const ACCOUNTS_KEY = "accounts"

export function useAccountsQuery(filters: AccountListFilters) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [ACCOUNTS_KEY, "list", user?.id, filters],
    queryFn: () => accountsService.list(user!.id, filters),
    enabled: !!user,
    placeholderData: keepPreviousData,
  })
}

export function useActiveAccountsCount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [ACCOUNTS_KEY, "active-count", user?.id],
    queryFn: () => accountsService.countActiveAccounts(user!.id),
    enabled: !!user,
  })
}

function useInvalidateAccounts() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [ACCOUNTS_KEY] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["reports"] })
  }
}

export function useCreateAccount() {
  const { user } = useAuth()
  const invalidate = useInvalidateAccounts()

  return useMutation({
    mutationFn: (values: AccountFormValues) => accountsService.create(user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Conta criada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar a conta", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateAccount() {
  const invalidate = useInvalidateAccounts()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: AccountFormValues }) =>
      accountsService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Conta atualizada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar a conta", { description: getErrorMessage(error) })
    },
  })
}

export function useSoftDeleteAccount() {
  const invalidate = useInvalidateAccounts()

  return useMutation({
    mutationFn: (id: string) => accountsService.softDelete(id),
    onSuccess: () => {
      invalidate()
      toast.success("Conta movida para a lixeira")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir a conta", { description: getErrorMessage(error) })
    },
  })
}

export function useRestoreAccount() {
  const invalidate = useInvalidateAccounts()

  return useMutation({
    mutationFn: (id: string) => accountsService.restore(id),
    onSuccess: () => {
      invalidate()
      toast.success("Conta restaurada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível restaurar a conta", { description: getErrorMessage(error) })
    },
  })
}

export function useReconcileAccount() {
  const invalidate = useInvalidateAccounts()

  return useMutation({
    mutationFn: ({
      accountId,
      statementBalance,
      notes,
    }: {
      accountId: string
      statementBalance: number
      notes?: string
    }) => accountsService.reconcile(accountId, statementBalance, notes),
    onSuccess: (reconciliation) => {
      invalidate()
      if (Number(reconciliation.difference) === 0) {
        toast.success("Conta reconciliada — nenhum ajuste necessário")
      } else {
        toast.success("Conta reconciliada com sucesso!", {
          description: `Ajuste de ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(Number(reconciliation.difference))} aplicado.`,
        })
      }
    },
    onError: (error) => {
      toast.error("Não foi possível reconciliar a conta", { description: getErrorMessage(error) })
    },
  })
}
