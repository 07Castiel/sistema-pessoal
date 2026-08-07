import { useRef, useState, type DragEvent } from "react"
import { Loader2, Paperclip, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadDropzoneProps {
  onFileSelected: (file: File) => void
  isUploading?: boolean
  accept?: string
  hint?: string
}

export function FileUploadDropzone({
  onFileSelected,
  isUploading,
  accept = "image/jpeg,image/png,image/webp,image/heic,application/pdf",
  hint = "PDF, JPG, PNG ou WEBP — até 10MB",
}: FileUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/40",
        dragOver && "border-primary bg-accent/60"
      )}
    >
      {isUploading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <UploadCloud className="size-6 text-muted-foreground" />
      )}
      <p className="text-sm font-medium">
        {isUploading ? "Enviando arquivo..." : "Arraste um arquivo ou clique para anexar"}
      </p>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Paperclip className="size-3" /> {hint}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}
