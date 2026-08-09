import { useState } from "react"
import { ArrowDownCircle, ArrowUpCircle, CircleDollarSign, Pencil, Plus, TrendingUp, Trash2 } from "lucide-react"
import {
  useInvestmentMovementsQuery,
  useDeleteInvestmentMovement,
} from "@/hooks/use-investment-movements"
import { formatCurrency, formatDate, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { INVESTMENT_TYPE_META } from "@/schemas/investment.schema"
import type { Investment, InvestmentMovement } from "@/types"
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { InvestmentMovementDialog } from "@/components/investments/investment-movement-dialog"

const MOVEMENT_META: Record<
  InvestmentMovement["type"],
  { label: string; icon: typeof ArrowUpCircle; className: string }
> = {
  aporte: { label: "Aporte", icon: ArrowUpCircle, className: "bg-success/10 text-success" },
  rendimento: { label: "Rendimento", icon: TrendingUp, className: "bg-primary/10 text-primary" },
  resgate: { label: "Resgate", icon: ArrowDownCircle, className: "bg-destructive/10 text-destructive" },
}

interface InvestmentDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment: Investment | null
  onEdit: (investment: Investment) => void
}

export function InvestmentDetailSheet({ open, onOpenChange, investment, onEdit }: InvestmentDetailSheetProps) {
  const { data: movements, isLoading } = useInvestmentMovementsQuery(open ? investment?.id : undefined)
  const deleteMovement = useDeleteInvestmentMovement()
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [editingMovement, setEditingMovement] = useState<InvestmentMovement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InvestmentMovement | null>(null)

  if (!investment) return null

  const meta = INVESTMENT_TYPE_META[investment.type] ?? { label: investment.type }
  const applied = Number(investment.applied_amount)
  const current = Number(investment.current_amount)
  const diff = current - applied
  const pct = applied > 0 ? (diff / applied) * 100 : 0

  function openCreateMovement() {
    setEditingMovement(null)
    setMovementDialogOpen(true)
  }

  function openEditMovement(m: InvestmentMovement) {
    setEditingMovement(m)
    setMovementDialogOpen(true)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <CircleDollarSign className="size-4" /> {investment.name}
              </SheetTitle>
              <SheetDescription>{meta.label}{investment.institution ? ` · ${investment.institution}` : ""}</SheetDescription>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(investment)} aria-label="Editar investimento">
              <Pencil className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor atual</span>
              {applied > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 px-1.5 text-[11px]",
                    diff >= 0
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-destructive/40 bg-destructive/10 text-destructive"
                  )}
                >
                  {diff >= 0 ? "+" : ""}
                  {formatPercent(pct, 1)}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-semibold tabular-nums">{formatCurrency(current)}</p>
            <div className="grid grid-cols-2 gap-2 border-t pt-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Aplicado</p>
                <p>{formatCurrency(applied)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resultado</p>
                <p className={diff >= 0 ? "text-success" : "text-destructive"}>
                  {diff >= 0 ? "+" : ""}
                  {formatCurrency(diff)}
                </p>
              </div>
            </div>
            {(investment.rate_description || investment.liquidity || investment.maturity_date) && (
              <div className="grid grid-cols-2 gap-2 border-t pt-3 text-sm">
                {investment.rate_description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Rentabilidade</p>
                    <p>{investment.rate_description}</p>
                  </div>
                )}
                {investment.liquidity && (
                  <div>
                    <p className="text-xs text-muted-foreground">Liquidez</p>
                    <p>{investment.liquidity}</p>
                  </div>
                )}
                {investment.maturity_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p>{formatDate(investment.maturity_date)}</p>
                  </div>
                )}
              </div>
            )}

            <Button className="w-full" variant="outline" onClick={openCreateMovement}>
              <Plus className="size-4" /> Nova movimentação
            </Button>
          </div>

          <p className="text-sm font-medium">Histórico</p>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !movements || movements.length === 0 ? (
            <EmptyState
              icon={CircleDollarSign}
              tone="primary"
              title="Nenhuma movimentação ainda"
              description="Registre um aporte para começar a acompanhar este investimento."
            />
          ) : (
            <ul className="space-y-1.5">
              {movements.map((m) => {
                const mMeta = MOVEMENT_META[m.type]
                const Icon = mMeta.icon
                return (
                  <li key={m.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", mMeta.className)}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {mMeta.label}
                        {m.notes ? ` · ${m.notes}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(Number(m.amount))}</span>
                    <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => openEditMovement(m)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remover"
                      onClick={() => setDeleteTarget(m)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </SheetContent>

      <InvestmentMovementDialog
        open={movementDialogOpen}
        onOpenChange={setMovementDialogOpen}
        investment={investment}
        movement={editingMovement}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remover movimentação"
        description="O valor atual e aplicado do investimento serão recalculados. Essa ação não pode ser desfeita."
        destructive
        confirmLabel="Remover"
        loading={deleteMovement.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMovement.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </Sheet>
  )
}
