import { useState } from "react"
import { ArrowDownCircle, ArrowUpCircle, Plus, Target, Trash2 } from "lucide-react"
import { useGoalContributionsQuery, useDeleteGoalContribution } from "@/hooks/use-goal-contributions"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Goal, GoalContribution } from "@/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { GoalContributionDialog } from "@/components/goals/goal-contribution-dialog"

interface GoalDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal | null
}

export function GoalDetailSheet({ open, onOpenChange, goal }: GoalDetailSheetProps) {
  const { data: contributions, isLoading } = useGoalContributionsQuery(open ? goal?.id : undefined)
  const deleteContribution = useDeleteGoalContribution()
  const [movementOpen, setMovementOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GoalContribution | null>(null)

  if (!goal) return null

  const target = Number(goal.target_amount)
  const current = Number(goal.current_amount)
  const pct = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0
  const canMove = goal.status !== "cancelada"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Target className="size-4" /> {goal.name}
          </SheetTitle>
          <SheetDescription>Progresso e movimentações desta meta.</SheetDescription>
        </SheetHeader>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progresso</span>
              <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
                {goal.status === "concluida"
                  ? "Concluída"
                  : goal.status === "cancelada"
                    ? "Cancelada"
                    : "Em andamento"}
              </Badge>
            </div>
            <Progress value={pct} className={cn(goal.status === "concluida" && "[&>div]:bg-success")} />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{formatCurrency(current)}</span>
              <span className="text-muted-foreground">de {formatCurrency(target)}</span>
            </div>

            {canMove && (
              <Button className="w-full" variant="outline" onClick={() => setMovementOpen(true)}>
                <Plus className="size-4" /> Novo aporte ou retirada
              </Button>
            )}
          </div>

          <p className="text-sm font-medium">Histórico</p>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !contributions || contributions.length === 0 ? (
            <EmptyState
              icon={Target}
              tone="primary"
              title="Nenhuma movimentação ainda"
              description="Registre o primeiro aporte para começar a acompanhar o progresso."
            />
          ) : (
            <ul className="space-y-1.5">
              {contributions.map((c) => {
                const isWithdrawal = Number(c.amount) < 0
                return (
                  <li key={c.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        isWithdrawal ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                      )}
                    >
                      {isWithdrawal ? (
                        <ArrowDownCircle className="size-4" />
                      ) : (
                        <ArrowUpCircle className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {isWithdrawal ? "Retirada" : "Aporte"}
                        {c.notes ? ` · ${c.notes}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(c.date)}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-medium tabular-nums",
                        isWithdrawal ? "text-destructive" : "text-success"
                      )}
                    >
                      {isWithdrawal ? "−" : "+"}
                      {formatCurrency(Math.abs(Number(c.amount)))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remover"
                      onClick={() => setDeleteTarget(c)}
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

      {canMove && (
        <GoalContributionDialog open={movementOpen} onOpenChange={setMovementOpen} goal={goal} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remover movimentação"
        description="O valor será removido do progresso da meta. Essa ação não pode ser desfeita."
        destructive
        confirmLabel="Remover"
        loading={deleteContribution.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteContribution.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </Sheet>
  )
}
