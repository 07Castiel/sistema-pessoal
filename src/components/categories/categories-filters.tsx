import { Search, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface CategoriesFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  trashed: boolean
  onTrashedChange: (value: boolean) => void
  trashCount: number
}

export function CategoriesFilters({
  search,
  onSearchChange,
  trashed,
  onTrashedChange,
  trashCount,
}: CategoriesFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar categoria ou subcategoria..."
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar categorias"
        />
      </div>

      <Button
        variant={trashed ? "secondary" : "outline"}
        size="sm"
        onClick={() => onTrashedChange(!trashed)}
        className="self-end sm:self-auto"
      >
        <Trash2 className="size-4" />
        Lixeira
        {trashCount > 0 && (
          <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 text-xs">
            {trashCount}
          </span>
        )}
      </Button>
    </div>
  )
}
