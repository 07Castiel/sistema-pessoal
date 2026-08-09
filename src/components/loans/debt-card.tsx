import type { LucideIcon } from "lucide-react"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { LoanStatus } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const STATUS_META: Record<LoanStatus, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "border-primary/40 bg-primary/10 text-primary" },
  atrasado: { label: "Atrasado", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  quitado: { label: "Quitado", className: "border-success/40 bg-success/10 text-success" },
  cancelado: { label: "Cancelado", className: "border-muted-foreground/30 text-muted-foreground" },
}

interface DebtCardProps {
  icon: LucideIcon
  title: string
  subtitle: string
  principal: number
  remainingBalance: number
  status: LoanStatus
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

/**
 * Compartilhado entre Empréstimos e Financiamentos, evita duplicar o
 * card. Não mostra "% pago" aqui de propósito: `remainingBalance` inclui
 * juros futuros e pode começar MAIOR que `principal` (confirmado testando
 * na UI — um financiamento recém-criado chegou a mostrar "-4% pago"), então
 * comparar os dois diretamente é matematicamente incorreto. O total real
 * pago (por contagem de parcelas) só está disponível dentro do sheet de
 * detalhe, que já carrega as parcelas — ver loan-detail-sheet.tsx/
 * financing-detail-sheet.tsx.
 */
export function DebtCard({
  icon: Icon,
  title,
  subtitle,
  principal,
  remainingBalance,
  status,
  onOpen,
  onEdit,
  onDelete,
}: DebtCardProps) {
  const meta = STATUS_META[status]

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className={cn("h-5 px-1.5 text-[11px]", meta.className)}>
            {meta.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${title}`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <button type="button" onClick={onOpen} className="space-y-1 text-left">
        <p
          className={cn(
            "text-lg font-semibold tabular-nums",
            status === "quitado" && "text-success"
          )}
        >
          {formatCurrency(remainingBalance)}
        </p>
        <p className="text-xs text-muted-foreground">
          Saldo devedor · valor original {formatCurrency(principal)}
        </p>
      </button>
    </div>
  )
}
