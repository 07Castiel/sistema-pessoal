import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { goalsService } from "@/services/goals.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { GoalFormValues } from "@/schemas/goal.schema"
import type { Goal } from "@/types"

const KEY = "goals"

function useInvalidateGoals() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
  }
}

export function useGoalsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "list", user?.id],
    queryFn: () => goalsService.list(user!.id),
    enabled: !!user,
  })
}

export function useCreateGoal() {
  const { user } = useAuth()
  const invalidate = useInvalidateGoals()

  return useMutation({
    mutationFn: (values: GoalFormValues) => goalsService.create(user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Meta criada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar a meta", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: GoalFormValues }) =>
      goalsService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Meta atualizada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar a meta", { description: getErrorMessage(error) })
    },
  })
}

export function useSetGoalStatus() {
  const invalidate = useInvalidateGoals()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Goal["status"] }) =>
      goalsService.setStatus(id, status),
    onSuccess: (_data, { status }) => {
      invalidate()
      toast.success(status === "cancelada" ? "Meta cancelada" : "Meta reaberta")
    },
    onError: (error) => {
      toast.error("Não foi possível alterar a meta", { description: getErrorMessage(error) })
    },
  })
}

export function useDeleteGoal() {
  const invalidate = useInvalidateGoals()

  return useMutation({
    mutationFn: (id: string) => goalsService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Meta excluída")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir a meta", { description: getErrorMessage(error) })
    },
  })
}
