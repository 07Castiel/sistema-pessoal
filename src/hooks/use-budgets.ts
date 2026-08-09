import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { budgetsService } from "@/services/budgets.service"
import { useAuth } from "@/hooks/use-auth"
import { useCategoriesQuery } from "@/hooks/use-categories"
import { getErrorMessage } from "@/lib/errors"
import type { BudgetFormValues } from "@/schemas/budget.schema"
import type { Budget, Category } from "@/types"

const KEY = "budgets"

export interface BudgetPeriod {
  year: number
  month: number
}

export function currentBudgetPeriod(): BudgetPeriod {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/** Faixas alinhadas aos mesmos limiares de `check_budget_alerts` (50/90%). */
export type BudgetHealth = "ok" | "warning" | "danger"

export interface BudgetProgress extends Budget {
  category: Category | null
  spent: number
  percentage: number
  remaining: number
  health: BudgetHealth
}

function useInvalidateBudgets() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: [KEY] })
}

/**
 * Combina `budgets` + `categories` (já em cache compartilhado) +
 * "realizado" (`v_category_summary`) no frontend — nenhum dos três dados
 * precisa de uma nova query de banco por orçamento (sem N+1).
 */
export function useBudgetsQuery(period: BudgetPeriod) {
  const { user } = useAuth()
  const userId = user?.id

  const budgetsQuery = useQuery({
    queryKey: [KEY, "list", userId, period.year, period.month],
    queryFn: () => budgetsService.listByPeriod(userId!, period.year, period.month),
    enabled: !!userId,
  })

  const spentQuery = useQuery({
    queryKey: [KEY, "spent", userId, period.year, period.month],
    queryFn: () => budgetsService.getSpentByCategory(userId!, period.year, period.month),
    enabled: !!userId,
  })

  const categoriesQuery = useCategoriesQuery()

  const data = useMemo<BudgetProgress[]>(() => {
    const budgets = budgetsQuery.data ?? []
    const spentMap = spentQuery.data ?? new Map<string, number>()
    const categoriesById = new Map((categoriesQuery.data ?? []).map((c) => [c.id, c]))

    return budgets.map((budget) => {
      const planned = Number(budget.planned_amount)
      const spent = spentMap.get(budget.category_id) ?? 0
      const percentage = planned > 0 ? (spent / planned) * 100 : 0
      const health: BudgetHealth = percentage >= 90 ? "danger" : percentage >= 50 ? "warning" : "ok"

      return {
        ...budget,
        category: categoriesById.get(budget.category_id) ?? null,
        spent,
        percentage,
        remaining: planned - spent,
        health,
      }
    })
  }, [budgetsQuery.data, spentQuery.data, categoriesQuery.data])

  return {
    data,
    isLoading: budgetsQuery.isLoading || spentQuery.isLoading || categoriesQuery.isLoading,
  }
}

export function useCreateBudget() {
  const { user } = useAuth()
  const invalidate = useInvalidateBudgets()

  return useMutation({
    mutationFn: (values: BudgetFormValues) => budgetsService.create(user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Orçamento criado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar o orçamento", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateBudget() {
  const invalidate = useInvalidateBudgets()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: BudgetFormValues }) =>
      budgetsService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Orçamento atualizado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar o orçamento", { description: getErrorMessage(error) })
    },
  })
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets()

  return useMutation({
    mutationFn: (id: string) => budgetsService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Orçamento excluído")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir o orçamento", { description: getErrorMessage(error) })
    },
  })
}
