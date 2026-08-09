import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { investmentsService } from "@/services/investments.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { InvestmentFormValues } from "@/schemas/investment.schema"

const KEY = "investments"

/** `v_net_worth` (dashboard) soma `investments.current_amount` — qualquer
 * mutação aqui também invalida o dashboard, mesmo padrão de outros módulos. */
function useInvalidateInvestments() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }
}

export function useInvestmentsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "list", user?.id],
    queryFn: () => investmentsService.list(user!.id),
    enabled: !!user,
  })
}

export function useCreateInvestment() {
  const { user } = useAuth()
  const invalidate = useInvalidateInvestments()

  return useMutation({
    mutationFn: (values: InvestmentFormValues) => investmentsService.create(user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Investimento criado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar o investimento", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateInvestment() {
  const invalidate = useInvalidateInvestments()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: InvestmentFormValues }) =>
      investmentsService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Investimento atualizado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar o investimento", { description: getErrorMessage(error) })
    },
  })
}

export function useDeleteInvestment() {
  const invalidate = useInvalidateInvestments()

  return useMutation({
    mutationFn: (id: string) => investmentsService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Investimento excluído")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir o investimento", { description: getErrorMessage(error) })
    },
  })
}
