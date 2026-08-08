import { useState } from "react"
import { FileText, Image as ImageIcon, Trash2 } from "lucide-react"
import { useAttachments } from "@/hooks/use-attachments"
import type { AttachmentEntityType } from "@/repositories/attachments.repository"
import type { Attachment } from "@/types"
import { formatDate } from "@/lib/format"
import { FileUploadDropzone } from "@/components/shared/file-upload-dropzone"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

function fileIcon(fileName: string) {
  return /\.(png|jpe?g|webp|heic)$/i.test(fileName) ? ImageIcon : FileText
}

export function AttachmentsPanel({
  entityType,
  entityId,
}: {
  entityType: AttachmentEntityType
  entityId: string
}) {
  const { attachments, isLoading, upload, isUploading, remove, openAttachment } = useAttachments(
    entityType,
    entityId
  )
  const [toDelete, setToDelete] = useState<Attachment | null>(null)

  return (
    <div className="space-y-3">
      <FileUploadDropzone onFileSelected={(file) => upload(file)} isUploading={isUploading} />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          Nenhum anexo ainda.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {attachments.map((attachment) => {
            const Icon = fileIcon(attachment.file_name)
            return (
              <li key={attachment.id} className="flex items-center justify-between gap-2 p-2.5">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => openAttachment(attachment)}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(attachment.created_at)}
                    </p>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setToDelete(attachment)}
                  aria-label="Remover anexo"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Remover anexo"
        description={`Tem certeza que deseja remover "${toDelete?.file_name}"? Essa ação não pode ser desfeita.`}
        destructive
        confirmLabel="Remover"
        onConfirm={() => {
          if (toDelete) remove(toDelete)
          setToDelete(null)
        }}
      />
    </div>
  )
}
