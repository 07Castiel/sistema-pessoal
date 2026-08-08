import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { tagsService } from "@/services/tags.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { TagFormValues } from "@/schemas/tag.schema"

const KEY = "tags"

function useInvalidateTags() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] })
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
  }
}

export function useTagsQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, "list", user?.id],
    queryFn: () => tagsService.list(user!.id),
    enabled: !!user,
  })
}

export function useTagUsage(tagId: string | null) {
  return useQuery({
    queryKey: [KEY, "usage", tagId],
    queryFn: () => tagsService.countUsage(tagId!),
    enabled: !!tagId,
  })
}

export function useTagUsageBatch(tagIds: string[]) {
  return useQuery({
    queryKey: [KEY, "usage-batch", tagIds],
    queryFn: () => tagsService.countUsageBatch(tagIds),
    enabled: tagIds.length > 0,
  })
}

export function useCreateTag() {
  const { user } = useAuth()
  const invalidate = useInvalidateTags()

  return useMutation({
    mutationFn: (values: TagFormValues) => tagsService.create(user!.id, values.name, values.color),
    onSuccess: () => {
      invalidate()
      toast.success("Tag criada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível criar a tag", {
        description: getErrorMessage(error, "Já existe uma tag com esse nome."),
      })
    },
  })
}

export function useUpdateTag() {
  const invalidate = useInvalidateTags()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: TagFormValues }) =>
      tagsService.update(id, values.name, values.color),
    onSuccess: () => {
      invalidate()
      toast.success("Tag atualizada com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar a tag", {
        description: getErrorMessage(error, "Já existe uma tag com esse nome."),
      })
    },
  })
}

export function useDeleteTag() {
  const invalidate = useInvalidateTags()

  return useMutation({
    mutationFn: (id: string) => tagsService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Tag excluída")
    },
    onError: (error) => {
      toast.error("Não foi possível excluir a tag", { description: getErrorMessage(error) })
    },
  })
}
