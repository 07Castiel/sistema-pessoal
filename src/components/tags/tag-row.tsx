import { memo } from "react"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import type { Tag } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TagRowProps {
  tag: Tag
  usageCount: number
  onEdit: (tag: Tag) => void
  onDelete: (tag: Tag) => void
}

export const TagRow = memo(function TagRow({ tag, usageCount, onEdit, onDelete }: TagRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30">
      <Badge variant="outline" className="shrink-0" style={{ borderColor: `${tag.color}66`, color: tag.color }}>
        {tag.name}
      </Badge>
      <p className="flex-1 truncate text-xs text-muted-foreground">
        {usageCount} {usageCount === 1 ? "lançamento" : "lançamentos"}
      </p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações da tag ${tag.name}`}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(tag)}>
            <Pencil className="size-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(tag)}>
            <Trash2 className="size-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
