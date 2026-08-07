import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { attachmentsService } from "@/services/attachments.service"
import { useAuth } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/errors"
import type { AttachmentEntityType } from "@/repositories/attachments.repository"
import type { Attachment } from "@/types"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]

export function useAttachments(entityType: AttachmentEntityType, entityId: string | null) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ["attachments", entityType, entityId]

  const listQuery = useQuery({
    queryKey,
    queryFn: () => attachmentsService.list(entityType, entityId!),
    enabled: !!entityId,
  })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("O arquivo deve ter no máximo 10MB.")
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        throw new Error("Formato não suportado. Envie uma imagem (JPG, PNG, WEBP, HEIC) ou PDF.")
      }
      return attachmentsService.upload(user!.id, entityType, entityId!, file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success("Anexo enviado com sucesso!")
    },
    onError: (error) => {
      toast.error("Não foi possível enviar o anexo", { description: getErrorMessage(error) })
    },
  })

  const remove = useMutation({
    mutationFn: (attachment: Attachment) => attachmentsService.remove(attachment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success("Anexo removido")
    },
    onError: (error) => {
      toast.error("Não foi possível remover o anexo", { description: getErrorMessage(error) })
    },
  })

  const openAttachment = async (attachment: Attachment) => {
    try {
      const url = await attachmentsService.getSignedUrl(attachment.file_url)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error) {
      toast.error("Não foi possível abrir o anexo", { description: getErrorMessage(error) })
    }
  }

  return {
    attachments: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    upload: upload.mutate,
    isUploading: upload.isPending,
    remove: remove.mutate,
    isRemoving: remove.isPending,
    openAttachment,
  }
}
