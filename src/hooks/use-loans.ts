import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { loansService } from "@/services/loans.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { LoanFormValues } from "@/schemas/loan.schema"
import type { InstallmentPaymentFormValues } from "@/schemas/installment-payment.schema"

const KEY = "loans"

/** `v_net_worth` (dashboard/relatórios) soma `remaining_balance` dos empréstimos. */
function useInvalidateLoans() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["reports"] })
  }
}

export function useLoansQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "list", user?.id],
    queryFn: () => loansService.list(user!.id),
    enabled: !!user,
  })
}

export function useLoanInstallmentsQuery(loanId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "installments", loanId],
    queryFn: () => loansService.listInstallments(loanId!),
    enabled: !!loanId,
  })
}

export function useCreateLoan() {
  const { user } = useAuth()
  const invalidate = useInvalidateLoans()

  return useMutation({
    mutationFn: (values: LoanFormValues) => loansService.create(user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Empréstimo criado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar o empréstimo", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateLoan() {
  const invalidate = useInvalidateLoans()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: LoanFormValues }) => loansService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Empréstimo atualizado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar o empréstimo", { description: getErrorMessage(error) })
    },
  })
}

export function useDeleteLoan() {
  const invalidate = useInvalidateLoans()

  return useMutation({
    mutationFn: (id: string) => loansService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Empréstimo excluído")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir o empréstimo", { description: getErrorMessage(error) })
    },
  })
}

export function usePayLoanInstallment() {
  const invalidate = useInvalidateLoans()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: InstallmentPaymentFormValues }) =>
      loansService.payInstallment(id, values.amount, values.paid_date),
    onSuccess: () => {
      invalidate()
      toast.success("Pagamento registrado")
    },
    onError: (error) => {
      toast.error("Não foi possível registrar o pagamento", { description: getErrorMessage(error) })
    },
  })
}
