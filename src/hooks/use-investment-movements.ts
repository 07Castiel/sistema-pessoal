import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { investmentMovementsService } from "@/services/investment-movements.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { InvestmentMovementFormValues } from "@/schemas/investment.schema"

const KEY = "investment-movements"

function useInvalidateInvestmentMovements() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["investments"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["reports"] })
  }
}

export function useInvestmentMovementsQuery(investmentId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "list", investmentId],
    queryFn: () => investmentMovementsService.listByInvestment(investmentId!),
    enabled: !!investmentId,
  })
}

export function useCreateInvestmentMovement() {
  const { user } = useAuth()
  const invalidate = useInvalidateInvestmentMovements()

  return useMutation({
    mutationFn: ({
      investmentId,
      values,
    }: {
      investmentId: string
      values: InvestmentMovementFormValues
    }) => investmentMovementsService.create(user!.id, investmentId, values),
    onSuccess: () => {
      invalidate()
      toast.success("Movimentação registrada")
    },
    onError: (error) => {
      toast.error("Não foi possível registrar a movimentação", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateInvestmentMovement() {
  const invalidate = useInvalidateInvestmentMovements()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: InvestmentMovementFormValues }) =>
      investmentMovementsService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Movimentação atualizada")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar a movimentação", { description: getErrorMessage(error) })
    },
  })
}

export function useDeleteInvestmentMovement() {
  const invalidate = useInvalidateInvestmentMovements()

  return useMutation({
    mutationFn: (id: string) => investmentMovementsService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Movimentação removida")
    },
    onError: (error) => {
      toast.error("Não foi possível remover a movimentação", { description: getErrorMessage(error) })
    },
  })
}
