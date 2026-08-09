import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CardUsage, CreditCard } from "@/types"
import { CARD_BRAND_OPTIONS } from "@/schemas/credit-card.schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const BRAND_LABEL = Object.fromEntries(CARD_BRAND_OPTIONS.map((o) => [o.value, o.label]))

interface CreditCardVisualProps {
  card: CreditCard
  usage?: CardUsage
  onOpen: (card: CreditCard) => void
  onEdit: (card: CreditCard) => void
  onArchiveToggle: (card: CreditCard) => void
  onDelete: (card: CreditCard) => void
}

export function CreditCardVisual({
  card,
  usage,
  onOpen,
  onEdit,
  onArchiveToggle,
  onDelete,
}: CreditCardVisualProps) {
  const limit = Number(card.credit_limit)
  const used = Number(usage?.used_amount ?? 0)
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const isArchived = card.status === "arquivada"

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30",
        isArchived && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(card)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${card.color}1a`, color: card.color }}
          >
            <DynamicIcon name={card.icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{card.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {card.bank ? `${card.bank} · ` : ""}
              {BRAND_LABEL[card.brand] ?? card.brand}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {isArchived && (
            <Badge variant="outline" className="text-[11px] text-muted-foreground">
              Arquivado
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${card.name}`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(card)}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchiveToggle(card)}>
                {isArchived ? (
                  <>
                    <ArchiveRestore className="size-4" /> Reativar
                  </>
                ) : (
                  <>
                    <Archive className="size-4" /> Arquivar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(card)}>
                <Trash2 className="size-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <button type="button" onClick={() => onOpen(card)} className="space-y-1.5 text-left">
        <Progress value={pct} className={cn(pct >= 90 && "[&>div]:bg-destructive")} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {formatCurrency(used)} usado de {formatCurrency(limit)}
          </span>
          <span className={cn("font-medium", pct >= 90 ? "text-destructive" : "text-muted-foreground")}>
            {formatCurrency(Number(usage?.available_limit ?? limit))} disponível
          </span>
        </div>
      </button>
    </div>
  )
}
