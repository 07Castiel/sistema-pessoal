import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { costCentersService } from "@/services/cost-centers.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { CostCenterFormValues } from "@/schemas/cost-center.schema"

const KEY = "cost-centers"

function useInvalidateCostCenters() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
  }
}

export function useCostCentersQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "list", user?.id],
    queryFn: () => costCentersService.list(user!.id),
    enabled: !!user,
  })
}

export function useCostCenterUsageBatch(ids: string[]) {
  return useQuery({
    queryKey: [KEY, "usage-batch", ids],
    queryFn: () => costCentersService.countUsageBatch(ids),
    enabled: ids.length > 0,
  })
}

export function useCreateCostCenter() {
  const { user } = useAuth()
  const invalidate = useInvalidateCostCenters()

  return useMutation({
    mutationFn: (values: CostCenterFormValues) =>
      costCentersService.create(user!.id, values.name, values.color, values.icon),
    onSuccess: () => {
      invalidate()
      toast.success("Centro de custo criado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar o centro de custo", { description: getErrorMessage(error) })
    },
  })
}

export function useUpdateCostCenter() {
  const invalidate = useInvalidateCostCenters()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: CostCenterFormValues }) =>
      costCentersService.update(id, values.name, values.color, values.icon),
    onSuccess: () => {
      invalidate()
      toast.success("Centro de custo atualizado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar o centro de custo", { description: getErrorMessage(error) })
    },
  })
}

export function useSetCostCenterActive() {
  const invalidate = useInvalidateCostCenters()

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      costCentersService.setActive(id, active),
    onSuccess: (_data, { active }) => {
      invalidate()
      toast.success(active ? "Centro de custo ativado" : "Centro de custo desativado")
    },
    onError: (error) => {
      toast.error("Não foi possível alterar o centro de custo", { description: getErrorMessage(error) })
    },
  })
}

export function useDeleteCostCenter() {
  const invalidate = useInvalidateCostCenters()

  return useMutation({
    mutationFn: (id: string) => costCentersService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Centro de custo excluído")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir o centro de custo", { description: getErrorMessage(error) })
    },
  })
}
