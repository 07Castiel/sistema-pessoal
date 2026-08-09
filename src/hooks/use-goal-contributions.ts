import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { goalContributionsService } from "@/services/goal-contributions.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { GoalContributionFormValues } from "@/schemas/goal.schema"

const KEY = "goal-contributions"

/** Um aporte/retirada muda `goals.current_amount` (e possivelmente o
 * status, via `check_goal_completion`) — sempre invalida os dois. */
function useInvalidateGoalContributions() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["goals"] })
  }
}

export function useGoalContributionsQuery(goalId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "list", goalId],
    queryFn: () => goalContributionsService.listByGoal(goalId!),
    enabled: !!goalId,
  })
}

export function useCreateGoalContribution() {
  const { user } = useAuth()
  const invalidate = useInvalidateGoalContributions()

  return useMutation({
    mutationFn: ({ goalId, values }: { goalId: string; values: GoalContributionFormValues }) =>
      goalContributionsService.create(user!.id, goalId, values),
    onSuccess: (_data, { values }) => {
      invalidate()
      toast.success(values.kind === "retirada" ? "Retirada registrada" : "Aporte registrado")
    },
    onError: (error) => {
      toast.error("Não foi possível registrar", { description: getErrorMessage(error) })
    },
  })
}

export function useDeleteGoalContribution() {
  const invalidate = useInvalidateGoalContributions()

  return useMutation({
    mutationFn: (id: string) => goalContributionsService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Lançamento removido")
    },
    onError: (error) => {
      toast.error("Não foi possível remover", { description: getErrorMessage(error) })
    },
  })
}
