import { MoreVertical, Pencil, TrendingDown, TrendingUp, Trash2 } from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { formatCurrency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Investment } from "@/types"
import { INVESTMENT_TYPE_META } from "@/schemas/investment.schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface InvestmentCardProps {
  investment: Investment
  onOpen: (investment: Investment) => void
  onEdit: (investment: Investment) => void
  onDelete: (investment: Investment) => void
}

export function InvestmentCard({ investment, onOpen, onEdit, onDelete }: InvestmentCardProps) {
  const meta = INVESTMENT_TYPE_META[investment.type] ?? { label: investment.type, icon: "trending-up", color: "#6366f1" }
  const applied = Number(investment.applied_amount)
  const current = Number(investment.current_amount)
  const diff = current - applied
  const pct = applied > 0 ? (diff / applied) * 100 : 0
  const isPositive = diff >= 0

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(investment)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
          >
            <DynamicIcon name={meta.icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{investment.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {meta.label}
              {investment.institution ? ` · ${investment.institution}` : ""}
            </p>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${investment.name}`}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(investment)}>
              <Pencil className="size-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(investment)}>
              <Trash2 className="size-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button type="button" onClick={() => onOpen(investment)} className="space-y-1 text-left">
        <p className="text-lg font-semibold tabular-nums">{formatCurrency(current)}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Aplicado: {formatCurrency(applied)}</span>
          {applied > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-0.5 px-1.5 text-[11px]",
                isPositive ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"
              )}
            >
              {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {formatPercent(pct, 1)}
            </Badge>
          )}
        </div>
      </button>
    </div>
  )
}
