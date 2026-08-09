import { useCallback, useMemo, useState } from "react"
import { AlertTriangle, ChevronLeft, ChevronRight, PiggyBank, PlusCircle, Target, Wallet } from "lucide-react"
import {
  useBudgetsQuery,
  useDeleteBudget,
  currentBudgetPeriod,
  type BudgetPeriod,
  type BudgetProgress,
} from "@/hooks/use-budgets"
import { formatCurrency, monthLabel } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { KpiCard } from "@/components/shared/kpi-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { BudgetCard } from "@/components/budgets/budget-card"
import { BudgetFormDialog } from "@/components/budgets/budget-form-dialog"

function shiftPeriod(period: BudgetPeriod, delta: number): BudgetPeriod {
  const date = new Date(period.year, period.month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export default function PlanningPage() {
  const [period, setPeriod] = useState<BudgetPeriod>(currentBudgetPeriod())
  const { data: budgets, isLoading } = useBudgetsQuery(period)
  const deleteBudget = useDeleteBudget()

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingBudget, setEditingBudget] = useState<BudgetProgress | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BudgetProgress | null>(null)

  const openCreate = useCallback(() => {
    setEditingBudget(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((budget: BudgetProgress) => {
    setEditingBudget(budget)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const totals = useMemo(() => {
    const planned = budgets.reduce((sum, b) => sum + Number(b.planned_amount), 0)
    const spent = budgets.reduce((sum, b) => sum + b.spent, 0)
    const overCount = budgets.filter((b) => b.health === "danger").length
    return { planned, spent, remaining: planned - spent, overCount }
  }, [budgets])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planejamento e Orçamento</h1>
          <p className="text-sm text-muted-foreground">Defina metas de gasto por categoria e acompanhe o realizado</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Período anterior"
              onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-medium">
              {monthLabel(period.month)} de {period.year}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Próximo período"
              onClick={() => setPeriod((p) => shiftPeriod(p, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button onClick={openCreate}>
            <PlusCircle className="size-4" /> Novo orçamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Planejado no período" value={formatCurrency(totals.planned)} icon={Target} loading={isLoading} />
        <KpiCard
          label="Realizado no período"
          value={formatCurrency(totals.spent)}
          icon={Wallet}
          tone="destructive"
          loading={isLoading}
        />
        <KpiCard
          label="Restante"
          value={formatCurrency(totals.remaining)}
          icon={PiggyBank}
          tone={totals.remaining >= 0 ? "success" : "destructive"}
          loading={isLoading}
        />
        <KpiCard
          label="Orçamentos estourados"
          value={String(totals.overCount)}
          icon={AlertTriangle}
          tone={totals.overCount > 0 ? "destructive" : "default"}
          loading={isLoading}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={Target}
          tone="primary"
          title="Nenhum orçamento neste período"
          description="Crie um orçamento por categoria para acompanhar quanto você planeja gastar e quanto já gastou."
          action={{ label: "Novo orçamento", onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <BudgetFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        budget={editingBudget}
        defaultPeriod={period}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir orçamento"
        description={`Excluir o orçamento de "${deleteTarget?.category?.name ?? "categoria removida"}" para ${
          deleteTarget ? `${monthLabel(deleteTarget.month)}/${deleteTarget.year}` : ""
        }? Esta ação não pode ser desfeita.`}
        destructive
        confirmLabel="Excluir"
        loading={deleteBudget.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteBudget.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
