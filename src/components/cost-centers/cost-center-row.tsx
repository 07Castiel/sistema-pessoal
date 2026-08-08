import { memo } from "react"
import { MoreVertical, Pencil, Power, PowerOff, Trash2 } from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { cn } from "@/lib/utils"
import type { CostCenter } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CostCenterRowProps {
  costCenter: CostCenter
  usageCount: number
  onEdit: (costCenter: CostCenter) => void
  onToggleActive: (costCenter: CostCenter) => void
  onDelete: (costCenter: CostCenter) => void
}

export const CostCenterRow = memo(function CostCenterRow({
  costCenter,
  usageCount,
  onEdit,
  onToggleActive,
  onDelete,
}: CostCenterRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30",
        !costCenter.active && "opacity-60"
      )}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${costCenter.color}1a`, color: costCenter.color }}
      >
        <DynamicIcon name={costCenter.icon} className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{costCenter.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {usageCount} {usageCount === 1 ? "lançamento" : "lançamentos"}
        </p>
      </div>

      <Badge
        variant="outline"
        className={cn(
          "h-5 shrink-0 px-1.5 text-[11px]",
          costCenter.active
            ? "border-success/40 bg-success/10 text-success"
            : "border-muted-foreground/30 text-muted-foreground"
        )}
      >
        {costCenter.active ? "Ativo" : "Inativo"}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${costCenter.name}`}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(costCenter)}>
            <Pencil className="size-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggleActive(costCenter)}>
            {costCenter.active ? (
              <>
                <PowerOff className="size-4" /> Desativar
              </>
            ) : (
              <>
                <Power className="size-4" /> Ativar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(costCenter)}>
            <Trash2 className="size-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
