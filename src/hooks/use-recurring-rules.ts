import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { recurringRulesService } from "@/services/recurring-rules.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { RecurringRuleFormValues } from "@/schemas/recurring-rule.schema"

const KEY = "recurring-rules"

function useInvalidateRecurringRules() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
    queryClient.invalidateQueries({ queryKey: ["accounts"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["reports"] })
  }
}

export function useRecurringRulesQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "list", user?.id],
    queryFn: () => recurringRulesService.list(user!.id),
    enabled: !!user,
  })
}

export function useTrashedRecurringRulesQuery(enabled: boolean) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "trashed", user?.id],
    queryFn: () => recurringRulesService.listTrashed(user!.id),
    enabled: !!user && enabled,
  })
}

export function useRecurringRuleStats(ruleIds: string[]) {
  return useQuery({
    queryKey: [KEY, "stats", ruleIds],
    queryFn: () => recurringRulesService.getStats(ruleIds),
    enabled: ruleIds.length > 0,
  })
}

export function useCreateRecurringRule() {
  const { user } = useAuth()
  const invalidate = useInvalidateRecurringRules()

  return useMutation({
    mutationFn: (values: RecurringRuleFormValues) =>
      recurringRulesService.create(user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Recorrência criada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar a recorrência", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateRecurringRule() {
  const invalidate = useInvalidateRecurringRules()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: RecurringRuleFormValues }) =>
      recurringRulesService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Recorrência atualizada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar a recorrência", { description: getErrorMessage(error) })
    },
  })
}

export function useSetRecurringRuleActive() {
  const invalidate = useInvalidateRecurringRules()

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      recurringRulesService.setActive(id, active),
    onSuccess: (_data, { active }) => {
      invalidate()
      toast.success(active ? "Recorrência reativada" : "Recorrência pausada")
    },
    onError: (error) => {
      toast.error("Não foi possível alterar a recorrência", { description: getErrorMessage(error) })
    },
  })
}

export function useEndRecurringRule() {
  const invalidate = useInvalidateRecurringRules()

  return useMutation({
    mutationFn: (id: string) => recurringRulesService.end(id),
    onSuccess: () => {
      invalidate()
      toast.success("Recorrência encerrada")
    },
    onError: (error) => {
      toast.error("Não foi possível encerrar a recorrência", { description: getErrorMessage(error) })
    },
  })
}

export function useSoftDeleteRecurringRule() {
  const invalidate = useInvalidateRecurringRules()

  return useMutation({
    mutationFn: (id: string) => recurringRulesService.softDelete(id),
    onSuccess: () => {
      invalidate()
      toast.success("Recorrência movida para a lixeira")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir a recorrência", { description: getErrorMessage(error) })
    },
  })
}

export function useRestoreRecurringRule() {
  const invalidate = useInvalidateRecurringRules()

  return useMutation({
    mutationFn: (id: string) => recurringRulesService.restore(id),
    onSuccess: () => {
      invalidate()
      toast.success("Recorrência restaurada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível restaurar a recorrência", { description: getErrorMessage(error) })
    },
  })
}

export function useGenerateDueRecurrences() {
  const invalidate = useInvalidateRecurringRules()

  return useMutation({
    mutationFn: () => recurringRulesService.generateDue(),
    onSuccess: (count: number) => {
      invalidate()
      toast.success(
        count > 0
          ? `${count} ${count === 1 ? "ocorrência gerada" : "ocorrências geradas"}!`
          : "Nenhuma ocorrência pendente de geração"
      )
    },
    onError: (error) => {
      toast.error("Não foi possível gerar as ocorrências", { description: getErrorMessage(error) })
    },
  })
}
