import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, FileText, Plus, Receipt } from "lucide-react"
import { useCardInvoicesQuery, useInvoiceTransactionsQuery } from "@/hooks/use-card-invoices"
import { effectiveInvoiceStatus } from "@/lib/card-invoice"
import { formatCurrency, formatDate, monthLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CreditCard, InvoiceStatus } from "@/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { CardPurchaseDialog } from "@/components/cards/card-purchase-dialog"
import { PayInvoiceDialog } from "@/components/cards/pay-invoice-dialog"

const STATUS_META: Record<InvoiceStatus, { label: string; className: string }> = {
  aberta: { label: "Aberta", className: "border-muted-foreground/30 text-muted-foreground" },
  fechada: { label: "Fechada", className: "border-primary/40 bg-primary/10 text-primary" },
  atrasada: { label: "Atrasada", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  paga: { label: "Paga", className: "border-success/40 bg-success/10 text-success" },
}

function periodLabel(referenceMonth: string) {
  const [year, month] = referenceMonth.split("-").map(Number)
  return `${monthLabel(month)}/${year}`
}

interface InvoiceDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CreditCard | null
}

export function InvoiceDetailSheet({ open, onOpenChange, card }: InvoiceDetailSheetProps) {
  const { data: invoices, isLoading } = useCardInvoicesQuery(open ? card?.id : undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  // Faturas vêm ordenadas por reference_month desc (mais recente primeiro).
  // Sem efeito para "selecionar a mais recente por padrão": deriva direto
  // na renderização — se selectedId não pertence mais à lista atual (fatura
  // trocada de cartão, ou ainda não escolhida), cai automaticamente na mais
  // recente, sem precisar de useEffect + setState.
  const sorted = useMemo(() => invoices ?? [], [invoices])
  const rawIndex = sorted.findIndex((i) => i.id === selectedId)
  const index = rawIndex >= 0 ? rawIndex : 0
  const selected = sorted[index] ?? null

  const { data: transactions, isLoading: loadingTransactions } = useInvoiceTransactionsQuery(
    selected?.id
  )

  const status = selected ? effectiveInvoiceStatus(selected) : null
  const canGoOlder = selected != null && index < sorted.length - 1
  const canGoNewer = selected != null && index > 0

  if (!card) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="size-4" /> {card.name}
          </SheetTitle>
          <SheetDescription>Faturas e compras lançadas neste cartão.</SheetDescription>
        </SheetHeader>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={Receipt}
              tone="primary"
              title="Nenhuma fatura ainda"
              description="Lance a primeira compra neste cartão para gerar a fatura do período."
              action={{ label: "Lançar compra", onClick: () => setPurchaseOpen(true) }}
            />
          ) : (
            selected && (
              <>
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={!canGoOlder}
                      onClick={() => setSelectedId(sorted[index + 1].id)}
                      aria-label="Fatura anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <div className="text-center">
                      <p className="text-sm font-medium">{periodLabel(selected.reference_month)}</p>
                      <Badge
                        variant="outline"
                        className={cn("mt-1 h-5 px-1.5 text-[11px]", STATUS_META[status!].className)}
                      >
                        {STATUS_META[status!].label}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={!canGoNewer}
                      onClick={() => setSelectedId(sorted[index - 1].id)}
                      aria-label="Próxima fatura"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Fechamento</p>
                      <p>{formatDate(selected.closing_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                      <p>{formatDate(selected.due_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">Total da fatura</span>
                    <span className="text-lg font-semibold tabular-nums">
                      {formatCurrency(Number(selected.total_amount))}
                    </span>
                  </div>

                  {selected.status !== "paga" && (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={Number(selected.total_amount) <= 0}
                      onClick={() => setPayOpen(true)}
                    >
                      Pagar fatura
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Transações da fatura</p>
                  <Button size="sm" variant="ghost" onClick={() => setPurchaseOpen(true)}>
                    <Plus className="size-4" /> Compra
                  </Button>
                </div>

                {loadingTransactions ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !transactions || transactions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma compra lançada nesta fatura ainda.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {transactions.map((t) => (
                      <li
                        key={t.id}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg border p-2.5",
                          t.deleted_at && "opacity-50"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(t.date!)}
                            {t.category_name ? ` · ${t.category_name}` : ""}
                            {t.deleted_at ? " · Na lixeira" : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums">
                          {formatCurrency(Number(t.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )
          )}
        </div>
      </SheetContent>

      <CardPurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} card={card} />
      {selected && (
        <PayInvoiceDialog open={payOpen} onOpenChange={setPayOpen} card={card} invoice={selected} />
      )}
    </Sheet>
  )
}
