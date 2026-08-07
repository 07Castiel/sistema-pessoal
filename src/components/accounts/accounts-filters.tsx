import { ArrowDownAZ, ArrowUpAZ, Search, Trash2 } from "lucide-react"
import { ACCOUNT_TYPE_OPTIONS } from "@/schemas/account.schema"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AccountListFilters } from "@/repositories/accounts.repository"

interface AccountsFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  type: NonNullable<AccountListFilters["type"]>
  onTypeChange: (value: NonNullable<AccountListFilters["type"]>) => void
  status: NonNullable<AccountListFilters["status"]>
  onStatusChange: (value: NonNullable<AccountListFilters["status"]>) => void
  sortBy: NonNullable<AccountListFilters["sortBy"]>
  sortDir: NonNullable<AccountListFilters["sortDir"]>
  onSortChange: (sortBy: NonNullable<AccountListFilters["sortBy"]>) => void
  trashed: boolean
  onTrashedChange: (value: boolean) => void
  trashCount: number
}

export function AccountsFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  status,
  onStatusChange,
  sortBy,
  sortDir,
  onSortChange,
  trashed,
  onTrashedChange,
  trashCount,
}: AccountsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou banco..."
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar contas"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={(v) => onTypeChange(v as typeof type)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => onStatusChange(v as typeof status)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="inativa">Inativa</SelectItem>
            <SelectItem value="arquivada">Arquivada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
          <SelectTrigger className="w-[150px]">
            {sortDir === "asc" ? (
              <ArrowUpAZ className="size-3.5 text-muted-foreground" />
            ) : (
              <ArrowDownAZ className="size-3.5 text-muted-foreground" />
            )}
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="current_balance">Saldo</SelectItem>
            <SelectItem value="created_at">Data de criação</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={trashed ? "secondary" : "outline"}
          size="sm"
          onClick={() => onTrashedChange(!trashed)}
        >
          <Trash2 className="size-4" />
          Lixeira
          {trashCount > 0 && (
            <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 text-xs">
              {trashCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
