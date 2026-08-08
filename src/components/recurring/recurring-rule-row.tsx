import { memo } from "react"
import {
  ArchiveRestore,
  CalendarClock,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Repeat,
  StopCircle,
  Trash2,
} from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Category, Account, RecurringRule } from "@/types"
import { RECURRENCE_FREQUENCY_OPTIONS } from "@/schemas/transaction.schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const FREQUENCY_LABEL = Object.fromEntries(
  RECURRENCE_FREQUENCY_OPTIONS.map((o) => [o.value, o.label])
)

interface RecurringRuleRowProps {
  rule: RecurringRule
  category?: Category
  account?: Account
  generatedCount: number
  lastOccurrenceDate: string | null
  trashed?: boolean
  onEdit: (rule: RecurringRule) => void
  onTogglePause: (rule: RecurringRule) => void
  onEnd: (rule: RecurringRule) => void
  onDelete: (rule: RecurringRule) => void
  onRestore: (rule: RecurringRule) => void
}

export const RecurringRuleRow = memo(function RecurringRuleRow({
  rule,
  category,
  account,
  generatedCount,
  lastOccurrenceDate,
  trashed = false,
  onEdit,
  onTogglePause,
  onEnd,
  onDelete,
  onRestore,
}: RecurringRuleRowProps) {
  const isIncome = rule.type === "receita"
  const isEnded = rule.end_date !== null && !rule.active
  const statusMeta = isEnded
    ? { label: "Encerrada", className: "border-muted-foreground/30 text-muted-foreground" }
    : rule.active
      ? { label: "Ativa", className: "border-success/40 bg-success/10 text-success" }
      : { label: "Pausada", className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30 sm:flex-nowrap">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${category?.color ?? "#64748b"}1a`, color: category?.color ?? "#64748b" }}
      >
        <DynamicIcon name={category?.icon} className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-medium">{rule.description}</p>
          <Badge variant="secondary" className="h-4.5 gap-0.5 px-1.5 text-[10px]">
            <Repeat className="size-2.5" />
            {FREQUENCY_LABEL[rule.frequency] ?? rule.frequency}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {category?.name ?? "Sem categoria"}
          {account?.name ? ` · ${account.name}` : ""}
          {" · "}
          {generatedCount} {generatedCount === 1 ? "ocorrência gerada" : "ocorrências geradas"}
          {lastOccurrenceDate ? ` · última em ${formatDate(lastOccurrenceDate)}` : ""}
        </p>
        {!trashed && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {isEnded ? "Encerrada" : `Próxima em ${formatDate(rule.next_run_date)}`}
          </p>
        )}
      </div>

      <Badge variant="outline" className={cn("h-5 shrink-0 px-1.5 text-[11px]", statusMeta.className)}>
        {statusMeta.label}
      </Badge>

      <p className={cn("shrink-0 text-right font-semibold tabular-nums", isIncome ? "text-success" : "text-destructive")}>
        {isIncome ? "+" : "−"}
        {formatCurrency(Number(rule.amount))}
      </p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${rule.description}`}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {trashed ? (
            <DropdownMenuItem onClick={() => onRestore(rule)}>
              <ArchiveRestore className="size-4" /> Restaurar
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={() => onEdit(rule)}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              {!isEnded &&
                (rule.active ? (
                  <DropdownMenuItem onClick={() => onTogglePause(rule)}>
                    <Pause className="size-4" /> Pausar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onTogglePause(rule)}>
                    <Play className="size-4" /> Reativar
                  </DropdownMenuItem>
                ))}
              {!isEnded && (
                <DropdownMenuItem onClick={() => onEnd(rule)}>
                  <StopCircle className="size-4" /> Encerrar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(rule)}>
                <Trash2 className="size-4" /> Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
