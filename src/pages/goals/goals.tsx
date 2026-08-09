import { useCallback, useMemo, useState } from "react"
import { CheckCircle2, PlusCircle, Target, Wallet } from "lucide-react"
import {
  useGoalsQuery,
  useSetGoalStatus,
  useDeleteGoal,
} from "@/hooks/use-goals"
import type { Goal } from "@/types"
import { formatCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCard } from "@/components/shared/kpi-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { GoalCard } from "@/components/goals/goal-card"
import { GoalFormDialog } from "@/components/goals/goal-form-dialog"
import { GoalDetailSheet } from "@/components/goals/goal-detail-sheet"

type Tab = "em_andamento" | "concluida" | "cancelada"

const TABS: { value: Tab; label: string }[] = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluídas" },
  { value: "cancelada", label: "Canceladas" },
]

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoalsQuery()
  const setStatus = useSetGoalStatus()
  const deleteGoal = useDeleteGoal()

  const [tab, setTab] = useState<Tab>("em_andamento")
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [openGoalId, setOpenGoalId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Goal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)

  const openCreate = useCallback(() => {
    setEditingGoal(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((goal: Goal) => {
    setEditingGoal(goal)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const filtered = useMemo(() => (goals ?? []).filter((g) => g.status === tab), [goals, tab])

  const totals = useMemo(() => {
    const active = (goals ?? []).filter((g) => g.status === "em_andamento")
    const completed = (goals ?? []).filter((g) => g.status === "concluida")
    return {
      activeCount: active.length,
      saved: active.reduce((sum, g) => sum + Number(g.current_amount), 0),
      completedCount: completed.length,
    }
  }, [goals])

  // Deriva sempre da lista já buscada (em vez de guardar uma cópia do
  // objeto no estado) para que o sheet reflita o current_amount/status
  // mais recentes assim que uma movimentação invalida a query — uma
  // cópia snapshot ficava desatualizada após registrar um aporte.
  const openGoal = (goals ?? []).find((g) => g.id === openGoalId) ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
          <p className="text-sm text-muted-foreground">Defina e acompanhe seus objetivos financeiros</p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="size-4" /> Nova meta
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Metas em andamento" value={String(totals.activeCount)} icon={Target} loading={isLoading} />
        <KpiCard
          label="Guardado (em andamento)"
          value={formatCurrency(totals.saved)}
          icon={Wallet}
          tone="success"
          loading={isLoading}
        />
        <KpiCard
          label="Metas concluídas"
          value={String(totals.completedCount)}
          icon={CheckCircle2}
          loading={isLoading}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        tab === "em_andamento" ? (
          <EmptyState
            icon={Target}
            tone="primary"
            title="Nenhuma meta em andamento"
            description="Crie uma meta para começar a acompanhar seu objetivo financeiro."
            action={{ label: "Nova meta", onClick: openCreate }}
          />
        ) : (
          <EmptyState
            icon={Target}
            title={tab === "concluida" ? "Nenhuma meta concluída ainda" : "Nenhuma meta cancelada"}
            description={
              tab === "concluida"
                ? "Metas são concluídas automaticamente quando o valor guardado atinge o alvo."
                : "Metas canceladas aparecem aqui e podem ser reabertas."
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onOpen={(g) => setOpenGoalId(g.id)}
              onEdit={openEdit}
              onCancel={setCancelTarget}
              onReopen={(g) => setStatus.mutate({ id: g.id, status: "em_andamento" })}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <GoalFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} goal={editingGoal} />

      <GoalDetailSheet
        open={!!openGoal}
        onOpenChange={(open) => !open && setOpenGoalId(null)}
        goal={openGoal}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancelar meta"
        description={`Cancelar "${cancelTarget?.name}"? O histórico de aportes é preservado e você pode reabrir a meta depois.`}
        destructive
        confirmLabel="Cancelar meta"
        cancelLabel="Voltar"
        loading={setStatus.isPending}
        onConfirm={() => {
          if (cancelTarget)
            setStatus.mutate(
              { id: cancelTarget.id, status: "cancelada" },
              { onSettled: () => setCancelTarget(null) }
            )
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir meta"
        description={`Excluir "${deleteTarget?.name}"? Todo o histórico de aportes e retiradas será removido permanentemente.`}
        destructive
        confirmLabel="Excluir"
        loading={deleteGoal.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteGoal.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
