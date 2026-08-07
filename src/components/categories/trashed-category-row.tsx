import { memo } from "react"
import { ArchiveRestore } from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import type { TrashedCategoryItem } from "@/lib/category-tree"
import { Button } from "@/components/ui/button"

interface TrashedCategoryRowProps {
  item: TrashedCategoryItem
  onRestore: (item: TrashedCategoryItem) => void
}

export const TrashedCategoryRow = memo(function TrashedCategoryRow({
  item,
  onRestore,
}: TrashedCategoryRowProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-dashed bg-card p-2.5">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg opacity-60"
        style={{ backgroundColor: `${item.color}1a`, color: item.color }}
      >
        <DynamicIcon name={item.icon} className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        {item.parentName && (
          <p className="truncate text-xs text-muted-foreground">
            Subcategoria de {item.parentName}
          </p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRestore(item)}>
        <ArchiveRestore className="size-3.5" /> Restaurar
      </Button>
    </div>
  )
})
