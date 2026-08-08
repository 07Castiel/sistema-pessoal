import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { accountsService } from "@/services/accounts.service"
import { categoriesService } from "@/services/categories.service"
import { tagsService } from "@/services/tags.service"
import { costCentersService } from "@/services/cost-centers.service"
import { buildCategoryTree } from "@/lib/category-tree"
import { useAuth } from "@/hooks/use-auth"
import type { CategoryNode } from "@/lib/category-tree"
import type { TransactionType } from "@/types"

/**
 * Listas auxiliares do formulário de lançamento: contas ativas,
 * categorias válidas para o tipo, tags e centros de custo.
 */
export function useTransactionLookups(type: TransactionType) {
  const { user } = useAuth()
  const userId = user?.id

  const accountsQuery = useQuery({
    queryKey: ["accounts", "selectable", userId],
    queryFn: () => accountsService.list(userId!, { status: "ativa", pageSize: 200 }),
    enabled: !!userId,
  })

  const categoriesQuery = useQuery({
    queryKey: ["categories", "list", userId],
    queryFn: () => categoriesService.list(userId!),
    enabled: !!userId,
  })

  const tagsQuery = useQuery({
    queryKey: ["tags", userId],
    queryFn: () => tagsService.list(userId!),
    enabled: !!userId,
  })

  const costCentersQuery = useQuery({
    queryKey: ["cost-centers", userId],
    queryFn: () => costCentersService.list(userId!),
    enabled: !!userId,
  })

  const activeCostCenters = useMemo(
    () => (costCentersQuery.data ?? []).filter((c) => c.active),
    [costCentersQuery.data]
  )

  // O banco recusa categoria de tipo incompatível; espelhamos a regra aqui
  // para que o usuário nem chegue a ver a opção inválida.
  const categoryTree: CategoryNode[] = useMemo(() => {
    const active = (categoriesQuery.data ?? []).filter(
      (c) => c.deleted_at === null && (c.type === type || c.type === "investimento")
    )
    return buildCategoryTree(active)
  }, [categoriesQuery.data, type])

  return {
    accounts: accountsQuery.data?.data ?? [],
    categoryTree,
    tags: tagsQuery.data ?? [],
    costCenters: activeCostCenters,
    isLoading:
      accountsQuery.isLoading ||
      categoriesQuery.isLoading ||
      tagsQuery.isLoading ||
      costCentersQuery.isLoading,
  }
}
