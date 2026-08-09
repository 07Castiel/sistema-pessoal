import { useCallback, useMemo, useState } from "react"
import { PlusCircle, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { useInvestmentsQuery, useDeleteInvestment } from "@/hooks/use-investments"
import type { Investment } from "@/types"
import { formatCurrency, formatPercent } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { KpiCard } from "@/components/shared/kpi-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { InvestmentCard } from "@/components/investments/investment-card"
import { InvestmentFormDialog } from "@/components/investments/investment-form-dialog"
import { InvestmentDetailSheet } from "@/components/investments/investment-detail-sheet"

export default function InvestmentsPage() {
  const { data: investments, isLoading } = useInvestmentsQuery()
  const deleteInvestment = useDeleteInvestment()

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [openInvestmentId, setOpenInvestmentId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null)

  const openCreate = useCallback(() => {
    setEditingInvestment(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((investment: Investment) => {
    setEditingInvestment(investment)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  // Deriva sempre da lista já buscada (mesmo padrão adotado em Metas
  // após o bug do sheet mostrando snapshot desatualizado) — assim o
  // sheet reflete applied_amount/current_amount mais recentes assim que
  // uma movimentação invalida a query.
  const openInvestment = (investments ?? []).find((i) => i.id === openInvestmentId) ?? null

  const totals = useMemo(() => {
    const list = investments ?? []
    const applied = list.reduce((sum, i) => sum + Number(i.applied_amount), 0)
    const current = list.reduce((sum, i) => sum + Number(i.current_amount), 0)
    return { applied, current, diff: current - applied }
  }, [investments])

  const pct = totals.applied > 0 ? (totals.diff / totals.applied) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investimentos</h1>
          <p className="text-sm text-muted-foreground">Tesouro, CDB, ações, FIIs, cripto e mais</p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="size-4" /> Novo investimento
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Valor aplicado" value={formatCurrency(totals.applied)} icon={Wallet} loading={isLoading} />
        <KpiCard
          label="Valor atual"
          value={formatCurrency(totals.current)}
          icon={Wallet}
          tone="success"
          loading={isLoading}
        />
        <KpiCard
          label="Resultado"
          value={`${totals.diff >= 0 ? "+" : ""}${formatCurrency(totals.diff)} (${formatPercent(pct, 1)})`}
          icon={totals.diff >= 0 ? TrendingUp : TrendingDown}
          tone={totals.diff >= 0 ? "success" : "destructive"}
          loading={isLoading}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (investments ?? []).length === 0 ? (
        <EmptyState
          icon={Wallet}
          tone="primary"
          title="Nenhum investimento cadastrado"
          description="Cadastre um investimento para começar a acompanhar sua carteira."
          action={{ label: "Novo investimento", onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(investments ?? []).map((investment) => (
            <InvestmentCard
              key={investment.id}
              investment={investment}
              onOpen={(i) => setOpenInvestmentId(i.id)}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <InvestmentFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} investment={editingInvestment} />

      <InvestmentDetailSheet
        open={!!openInvestment}
        onOpenChange={(open) => !open && setOpenInvestmentId(null)}
        investment={openInvestment}
        onEdit={openEdit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir investimento"
        description={`Excluir "${deleteTarget?.name}"? Todo o histórico de movimentações será removido permanentemente — não há como restaurar.`}
        destructive
        confirmLabel="Excluir"
        loading={deleteInvestment.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteInvestment.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
