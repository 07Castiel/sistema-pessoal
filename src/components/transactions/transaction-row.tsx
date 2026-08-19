import { memo } from "react"
import {
  ArchiveRestore,
  CalendarClock,
  Check,
  Coins,
  Copy,
  History,
  MoreVertical,
  Pencil,
  Repeat,
  RotateCcw,
  Trash2,
  XCircle,
  Layers,
} from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { EffectiveStatus, TransactionEnriched } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * O status nunca é comunicado só por cor: cada estado tem rótulo textual
 * e ícone próprio (requisito de acessibilidade).
 */
const STATUS_META: Record<
  EffectiveStatus,
  { label: string; className: string; icon: typeof Check }
> = {
  pendente: { label: "Pendente", className: "border-muted-foreground/30 text-muted-foreground", icon: CalendarClock },
  parcialmente_pago: { label: "Parcialmente paga", className: "border-warning/40 bg-warning/10 text-warning", icon: Coins },
  parcialmente_recebido: { label: "Parcialmente recebida", className: "border-warning/40 bg-warning/10 text-warning", icon: Coins },
  atrasado: { label: "Atrasado", className: "border-destructive/40 bg-destructive/10 text-destructive", icon: CalendarClock },
  pago: { label: "Pago", className: "border-success/40 bg-success/10 text-success", icon: Check },
  recebido: { label: "Recebido", className: "border-success/40 bg-success/10 text-success", icon: Check },
  cancelado: { label: "Cancelado", className: "border-muted-foreground/30 text-muted-foreground line-through", icon: XCircle },
}

interface TransactionRowProps {
  transaction: TransactionEnriched
  trashed?: boolean
  onEdit: (t: TransactionEnriched) => void
  onDuplicate: (t: TransactionEnriched) => void
  onRegisterPayment: (t: TransactionEnriched) => void
  onViewHistory: (t: TransactionEnriched) => void
  onReactivate: (t: TransactionEnriched) => void
  onCancel: (t: TransactionEnriched) => void
  onDelete: (t: TransactionEnriched) => void
  onRestore: (t: TransactionEnriched) => void
}

export const TransactionRow = memo(function TransactionRow({
  transaction: t,
  trashed = false,
  onEdit,
  onDuplicate,
  onRegisterPayment,
  onViewHistory,
  onReactivate,
  onCancel,
  onDelete,
  onRestore,
}: TransactionRowProps) {
  const status = (t.effective_status ?? "pendente") as EffectiveStatus
  const meta = STATUS_META[status] ?? STATUS_META.pendente
  const StatusIcon = meta.icon
  const isIncome = t.type === "receita"
  const isCancelled = status === "cancelado"
  const isFullySettled = status === "pago" || status === "recebido"
  const isPartial = status === "parcialmente_pago" || status === "parcialmente_recebido"
  const amount = Number(t.amount ?? 0)
  const paidAmount = Number(t.paid_amount ?? 0)
  const hasPayments = paidAmount > 0
  const tags = (t.tags as { id: string; name: string; color: string }[] | null) ?? []

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30 sm:flex-nowrap">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: `${t.category_color ?? "#64748b"}1a`,
          color: t.category_color ?? "#64748b",
        }}
      >
        <DynamicIcon name={t.category_icon} className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className={cn("truncate font-medium", isCancelled && "line-through opacity-70")}>
            {t.description}
          </p>
          {t.installment_total && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="h-4.5 gap-0.5 px-1.5 text-[10px]">
                  <Layers className="size-2.5" />
                  {t.installment_number}/{t.installment_total}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Parcela {t.installment_number} de {t.installment_total}</TooltipContent>
            </Tooltip>
          )}
          {t.recurring_id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="h-4.5 gap-0.5 px-1.5 text-[10px]">
                  <Repeat className="size-2.5" /> Recorrente
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Gerado por uma recorrência</TooltipContent>
            </Tooltip>
          )}
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="h-4.5 px-1.5 text-[10px]"
              style={{ borderColor: `${tag.color}66`, color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(t.date!)}
          {t.category_name ? ` · ${t.parent_category_name ? `${t.parent_category_name} › ` : ""}${t.category_name}` : ""}
          {t.account_name ? ` · ${t.account_name}` : ""}
          {t.supplier ? ` · ${t.supplier}` : ""}
        </p>
        {isPartial && (
          <p className="truncate text-xs text-warning">
            {isIncome ? "Recebido" : "Pago"} até agora: {formatCurrency(paidAmount)} de{" "}
            {formatCurrency(amount)}
          </p>
        )}
      </div>

      <Badge variant="outline" className={cn("h-5 shrink-0 gap-1 px-1.5 text-[11px]", meta.className)}>
        <StatusIcon className="size-3" />
        {meta.label}
      </Badge>

      <p
        className={cn(
          "shrink-0 text-right font-semibold tabular-nums",
          isCancelled ? "text-muted-foreground line-through" : isIncome ? "text-success" : "text-destructive"
        )}
      >
        {isIncome ? "+" : "−"}
        {formatCurrency(amount)}
      </p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${t.description}`}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {trashed ? (
            <DropdownMenuItem onClick={() => onRestore(t)}>
              <ArchiveRestore className="size-4" /> Restaurar
            </DropdownMenuItem>
          ) : (
            <>
              {!isCancelled && !isFullySettled && (
                <DropdownMenuItem onClick={() => onRegisterPayment(t)}>
                  <Coins className="size-4" />
                  {isIncome ? "Registrar recebimento" : "Registrar pagamento"}
                </DropdownMenuItem>
              )}
              {hasPayments && (
                <DropdownMenuItem onClick={() => onViewHistory(t)}>
                  <History className="size-4" /> Ver histórico
                </DropdownMenuItem>
              )}
              {isCancelled && (
                <DropdownMenuItem onClick={() => onReactivate(t)}>
                  <RotateCcw className="size-4" /> Reativar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(t)}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(t)}>
                <Copy className="size-4" /> Duplicar
              </DropdownMenuItem>
              {/* Cancelar exige paid_amount = 0 (bloqueado no banco) — some
                  do menu assim que existe algum pagamento, mesmo espírito de
                  "Marcar como paga" sumir quando já liquidado. */}
              {!isCancelled && !hasPayments && (
                <DropdownMenuItem onClick={() => onCancel(t)}>
                  <XCircle className="size-4" /> Cancelar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(t)}>
                <Trash2 className="size-4" /> Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
