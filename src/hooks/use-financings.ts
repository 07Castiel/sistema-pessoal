import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { financingsService } from "@/services/financings.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { FinancingFormValues } from "@/schemas/financing.schema"
import type { InstallmentPaymentFormValues } from "@/schemas/installment-payment.schema"

const KEY = "financings"

/** `v_net_worth` (dashboard/relatórios) soma `remaining_balance` dos financiamentos. */
function useInvalidateFinancings() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["reports"] })
    queryClient.invalidateQueries({ queryKey: ["calendar"] })
  }
}

export function useFinancingsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "list", user?.id],
    queryFn: () => financingsService.list(user!.id),
    enabled: !!user,
  })
}

export function useFinancingInstallmentsQuery(financingId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "installments", financingId],
    queryFn: () => financingsService.listInstallments(financingId!),
    enabled: !!financingId,
  })
}

export function useCreateFinancing() {
  const { user } = useAuth()
  const invalidate = useInvalidateFinancings()

  return useMutation({
    mutationFn: (values: FinancingFormValues) => financingsService.create(user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Financiamento criado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar o financiamento", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateFinancing() {
  const invalidate = useInvalidateFinancings()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: FinancingFormValues }) =>
      financingsService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Financiamento atualizado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar o financiamento", { description: getErrorMessage(error) })
    },
  })
}

export function useDeleteFinancing() {
  const invalidate = useInvalidateFinancings()

  return useMutation({
    mutationFn: (id: string) => financingsService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Financiamento excluído")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir o financiamento", { description: getErrorMessage(error) })
    },
  })
}

export function usePayFinancingInstallment() {
  const invalidate = useInvalidateFinancings()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: InstallmentPaymentFormValues }) =>
      financingsService.payInstallment(id, values.amount, values.paid_date),
    onSuccess: () => {
      invalidate()
      toast.success("Pagamento registrado")
    },
    onError: (error) => {
      toast.error("Não foi possível registrar o pagamento", { description: getErrorMessage(error) })
    },
  })
}
