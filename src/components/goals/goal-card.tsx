import { Ban, CalendarClock, MoreVertical, Pencil, RotateCcw, Trash2 } from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Goal } from "@/types"
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

const PRIORITY_META: Record<Goal["priority"], { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "border-muted-foreground/30 text-muted-foreground" },
  media: { label: "Média", className: "border-primary/40 bg-primary/10 text-primary" },
  alta: { label: "Alta", className: "border-destructive/40 bg-destructive/10 text-destructive" },
}

interface GoalCardProps {
  goal: Goal
  onOpen: (goal: Goal) => void
  onEdit: (goal: Goal) => void
  onCancel: (goal: Goal) => void
  onReopen: (goal: Goal) => void
  onDelete: (goal: Goal) => void
}

export function GoalCard({ goal, onOpen, onEdit, onCancel, onReopen, onDelete }: GoalCardProps) {
  const target = Number(goal.target_amount)
  const current = Number(goal.current_amount)
  const pct = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0
  const isCancelled = goal.status === "cancelada"
  const isCompleted = goal.status === "concluida"

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30",
        isCancelled && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(goal)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${goal.color}1a`, color: goal.color }}
          >
            <DynamicIcon name={goal.icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{goal.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {goal.target_date ? `Até ${formatDate(goal.target_date)}` : "Sem prazo definido"}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className={cn("h-5 px-1.5 text-[11px]", PRIORITY_META[goal.priority].className)}>
            {PRIORITY_META[goal.priority].label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${goal.name}`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(goal)}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              {isCancelled ? (
                <DropdownMenuItem onClick={() => onReopen(goal)}>
                  <RotateCcw className="size-4" /> Reabrir
                </DropdownMenuItem>
              ) : (
                !isCompleted && (
                  <DropdownMenuItem onClick={() => onCancel(goal)}>
                    <Ban className="size-4" /> Cancelar
                  </DropdownMenuItem>
                )
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(goal)}>
                <Trash2 className="size-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <button type="button" onClick={() => onOpen(goal)} className="space-y-1.5 text-left">
        <Progress value={pct} className={cn(isCompleted && "[&>div]:bg-success")} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {formatCurrency(current)} de {formatCurrency(target)}
          </span>
          <span
            className={cn(
              "font-medium",
              isCompleted ? "text-success" : isCancelled ? "text-muted-foreground" : "text-primary"
            )}
          >
            {isCompleted ? "Concluída" : isCancelled ? "Cancelada" : `${pct}%`}
          </span>
        </div>
      </button>

      {!isCancelled && !isCompleted && goal.target_date && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" />
          Prazo: {formatDate(goal.target_date)}
        </div>
      )}
    </div>
  )
}
