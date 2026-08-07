import { memo } from "react"
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core"
import { ChevronRight, GripVertical, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { cn } from "@/lib/utils"
import type { Category } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CategoryRowProps {
  category: Category
  childCount?: number
  expanded?: boolean
  onToggleExpand?: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onAddSubcategory?: (category: Category) => void
  dragHandleProps?: {
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners
  }
  isDragging?: boolean
}

export const CategoryRow = memo(function CategoryRow({
  category,
  childCount = 0,
  expanded = false,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddSubcategory,
  dragHandleProps,
  isDragging = false,
}: CategoryRowProps) {
  const isSubcategory = !!category.parent_id

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-2.5 transition-colors hover:bg-accent/30",
        isSubcategory && "ml-8 border-dashed",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {dragHandleProps && (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}

      {!isSubcategory && childCount > 0 ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
          aria-label={expanded ? "Recolher subcategorias" : "Expandir subcategorias"}
          aria-expanded={expanded}
        >
          <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} />
        </button>
      ) : (
        <span className="size-5 shrink-0" />
      )}

      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${category.color}1a`, color: category.color }}
      >
        <DynamicIcon name={category.icon} className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{category.name}</p>
      </div>

      {category.is_default && (
        <Badge variant="outline" className="h-4.5 shrink-0 px-1.5 text-[10px]">
          Padrão
        </Badge>
      )}
      {!isSubcategory && childCount > 0 && (
        <Badge variant="secondary" className="h-4.5 shrink-0 px-1.5 text-[10px]">
          {childCount} {childCount === 1 ? "subcategoria" : "subcategorias"}
        </Badge>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Ações da categoria">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="size-4" /> Editar
          </DropdownMenuItem>
          {!isSubcategory && onAddSubcategory && (
            <DropdownMenuItem onClick={() => onAddSubcategory(category)}>
              <Plus className="size-4" /> Adicionar subcategoria
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(category)}>
            <Trash2 className="size-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
