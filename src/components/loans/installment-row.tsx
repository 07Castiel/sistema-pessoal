import { Check, CalendarClock } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { InstallmentStatus } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const STATUS_META: Record<InstallmentStatus, { label: string; className: string; icon: typeof Check }> = {
  pendente: { label: "Pendente", className: "border-muted-foreground/30 text-muted-foreground", icon: CalendarClock },
  atrasado: { label: "Atrasado", className: "border-destructive/40 bg-destructive/10 text-destructive", icon: CalendarClock },
  pago: { label: "Pago", className: "border-success/40 bg-success/10 text-success", icon: Check },
}

interface InstallmentRowProps {
  number: number
  dueDate: string
  amount: number
  paidAmount: number
  status: InstallmentStatus
  amortizationAmount?: number
  interestAmount?: number
  onPay: () => void
}

export function InstallmentRow({
  number,
  dueDate,
  amount,
  paidAmount,
  status,
  amortizationAmount,
  interestAmount,
  onPay,
}: InstallmentRowProps) {
  const meta = STATUS_META[status]
  const StatusIcon = meta.icon
  const isPaid = status === "pago"
  const hasPartialPayment = !isPaid && paidAmount > 0

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{formatDate(dueDate)}</p>
        {amortizationAmount != null && interestAmount != null && (
          <p className="text-xs text-muted-foreground">
            Amortização {formatCurrency(amortizationAmount)} · Juros {formatCurrency(interestAmount)}
          </p>
        )}
        {hasPartialPayment && (
          <p className="text-xs text-muted-foreground">Pago até agora: {formatCurrency(paidAmount)}</p>
        )}
      </div>
      <Badge variant="outline" className={cn("h-5 shrink-0 gap-1 px-1.5 text-[11px]", meta.className)}>
        <StatusIcon className="size-3" />
        {meta.label}
      </Badge>
      <p className="shrink-0 text-right font-semibold tabular-nums">{formatCurrency(amount)}</p>
      {!isPaid && (
        <Button size="sm" variant="outline" onClick={onPay}>
          Registrar pagamento
        </Button>
      )}
    </div>
  )
}
