import { AlertTriangle, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { BudgetProgress } from "@/hooks/use-budgets"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const HEALTH_META = {
  ok: { label: "Sob controle", badge: "border-success/40 bg-success/10 text-success", bar: "[&>div]:bg-success" },
  warning: {
    label: "Atenção",
    badge: "border-warning/40 bg-warning/10 text-warning",
    bar: "[&>div]:bg-warning",
  },
  danger: {
    label: "Estourado",
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
    bar: "[&>div]:bg-destructive",
  },
} as const

interface BudgetCardProps {
  budget: BudgetProgress
  onEdit: (budget: BudgetProgress) => void
  onDelete: (budget: BudgetProgress) => void
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const meta = HEALTH_META[budget.health]
  const barValue = Math.min(100, Math.max(0, budget.percentage))
  const categoryName = budget.category?.name ?? "Categoria removida"
  const categoryIcon = budget.category?.icon ?? "help-circle"
  const categoryColor = budget.category?.color ?? "var(--muted-foreground)"

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${categoryColor}1a`, color: categoryColor }}
          >
            <DynamicIcon name={categoryIcon} className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{categoryName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatCurrency(budget.spent)} de {formatCurrency(Number(budget.planned_amount))}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className={cn("h-5 gap-1 px-1.5 text-[11px]", meta.badge)}>
            {budget.health === "danger" && <AlertTriangle className="size-3" />}
            {meta.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Ações do orçamento de ${categoryName}`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(budget)}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(budget)}>
                <Trash2 className="size-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-1.5">
        <Progress value={barValue} className={meta.bar} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {budget.remaining >= 0
              ? `${formatCurrency(budget.remaining)} restante`
              : `${formatCurrency(-budget.remaining)} acima do planejado`}
          </span>
          <span
            className={cn(
              "font-medium",
              budget.health === "danger"
                ? "text-destructive"
                : budget.health === "warning"
                  ? "text-warning"
                  : "text-success"
            )}
          >
            {Math.round(budget.percentage)}%
          </span>
        </div>
      </div>
    </div>
  )
}
