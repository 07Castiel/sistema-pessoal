import { memo, useState } from "react"
import {
  Archive,
  ArchiveRestore,
  History,
  MoreVertical,
  Pencil,
  Scale,
} from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Account } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const TYPE_LABEL: Record<string, string> = {
  carteira: "Carteira",
  banco: "Banco",
  caixa: "Caixa",
  conta_corrente: "Conta Corrente",
  conta_poupanca: "Poupança",
  conta_digital: "Conta Digital",
  investimentos: "Investimentos",
  conta_internacional: "Internacional",
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ativa: "default",
  inativa: "secondary",
  arquivada: "outline",
}

interface AccountRowProps {
  account: Account
  trashed?: boolean
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  onRestore: (account: Account) => void
  onReconcile: (account: Account) => void
  onViewHistory: (account: Account) => void
}

export const AccountRow = memo(function AccountRow({
  account,
  trashed,
  onEdit,
  onDelete,
  onRestore,
  onReconcile,
  onViewHistory,
}: AccountRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30 sm:flex-nowrap">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${account.color}1a`, color: account.color }}
      >
        <DynamicIcon name={account.icon} className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{account.name}</p>
          {!trashed && (
            <Badge variant={STATUS_VARIANT[account.status]} className="h-4.5 px-1.5 text-[10px]">
              {account.status === "ativa" ? "Ativa" : account.status === "inativa" ? "Inativa" : "Arquivada"}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {TYPE_LABEL[account.type]}
          {account.bank ? ` · ${account.bank}` : ""}
        </p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "font-semibold tabular-nums",
            Number(account.current_balance) < 0 && "text-destructive"
          )}
        >
          {formatCurrency(Number(account.current_balance))}
        </p>
      </div>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Ações da conta">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {trashed ? (
            <DropdownMenuItem onClick={() => onRestore(account)}>
              <ArchiveRestore className="size-4" /> Restaurar
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReconcile(account)}>
                <Scale className="size-4" /> Reconciliar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory(account)}>
                <History className="size-4" /> Ver histórico
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(account)}>
                <Archive className="size-4" /> Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
