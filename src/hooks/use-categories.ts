import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { categoriesService } from "@/services/categories.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import {
  buildCategoryTree,
  buildTrashedList,
  filterCategoryTree,
  filterTrashedList,
  groupTrashedByType,
  groupTreeByType,
} from "@/lib/category-tree"
import type { CategoryFormValues } from "@/schemas/category.schema"
import type { Category } from "@/types"

const CATEGORIES_KEY = "categories"

export function useCategoriesQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [CATEGORIES_KEY, "list", user?.id],
    queryFn: () => categoriesService.list(user!.id),
    enabled: !!user,
  })
}

export function useCategoryTree(categories: Category[] | undefined, search: string) {
  return useMemo(() => {
    const active = (categories ?? []).filter((c) => c.deleted_at === null)
    const tree = buildCategoryTree(active)
    const filtered = filterCategoryTree(tree, search)
    return groupTreeByType(filtered)
  }, [categories, search])
}

export function useTrashedCategories(categories: Category[] | undefined, search: string) {
  return useMemo(() => {
    const trashed = buildTrashedList(categories ?? [])
    const filtered = filterTrashedList(trashed, search)
    return groupTrashedByType(filtered)
  }, [categories, search])
}

export function useCategoryUsage(categoryId: string | null) {
  return useQuery({
    queryKey: [CATEGORIES_KEY, "usage", categoryId],
    queryFn: () => categoriesService.countUsage(categoryId!),
    enabled: !!categoryId,
  })
}

export function useCategoryActiveChildren(categoryId: string | null) {
  return useQuery({
    queryKey: [CATEGORIES_KEY, "active-children", categoryId],
    queryFn: () => categoriesService.countActiveChildren(categoryId!),
    enabled: !!categoryId,
  })
}

function useInvalidateCategories() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] })
}

export function useCreateCategory() {
  const { user } = useAuth()
  const invalidate = useInvalidateCategories()

  return useMutation({
    mutationFn: (values: CategoryFormValues) => categoriesService.create(user!.id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Categoria criada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar a categoria", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: CategoryFormValues }) =>
      categoriesService.update(id, values),
    onSuccess: () => {
      invalidate()
      toast.success("Categoria atualizada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar a categoria", { description: getErrorMessage(error) })
    },
  })
}

export function useSoftDeleteCategory() {
  const invalidate = useInvalidateCategories()

  return useMutation({
    mutationFn: (id: string) => categoriesService.softDelete(id),
    onSuccess: () => {
      invalidate()
      toast.success("Categoria movida para a lixeira")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir a categoria", { description: getErrorMessage(error) })
    },
  })
}

export function useRestoreCategory() {
  const invalidate = useInvalidateCategories()

  return useMutation({
    mutationFn: (id: string) => categoriesService.restore(id),
    onSuccess: () => {
      invalidate()
      toast.success("Categoria restaurada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível restaurar a categoria", { description: getErrorMessage(error) })
    },
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (orderedIds: string[]) => categoriesService.reorder(orderedIds),
    onMutate: async (orderedIds) => {
      const queryKey = [CATEGORIES_KEY, "list", user?.id]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Category[]>(queryKey)

      if (previous) {
        const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
        const updated = previous.map((category) =>
          orderMap.has(category.id)
            ? { ...category, sort_order: orderMap.get(category.id)! }
            : category
        )
        queryClient.setQueryData(queryKey, updated)
      }

      return { previous, queryKey }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous)
      toast.error("Não foi possível reordenar", { description: getErrorMessage(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] })
    },
  })
}
