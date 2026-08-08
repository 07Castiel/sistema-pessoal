import { Search, SlidersHorizontal, Trash2, X } from "lucide-react"
import { PAYMENT_METHOD_OPTIONS } from "@/schemas/transaction.schema"
import type { TransactionListFilters } from "@/repositories/transactions.repository"
import type { Account, CostCenter, Tag } from "@/types"
import type { CategoryNode } from "@/lib/category-tree"
import { CurrencyInput } from "@/components/shared/currency-input"
import { TagMultiSelect } from "@/components/transactions/tag-multi-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface TransactionsFiltersProps {
  filters: TransactionListFilters
  onChange: (patch: Partial<TransactionListFilters>) => void
  onClear: () => void
  activeCount: number
  accounts: Account[]
  categoryTree: CategoryNode[]
  costCenters: CostCenter[]
  tags: Tag[]
  trashCount: number
}

export function TransactionsFilters({
  filters,
  onChange,
  onClear,
  activeCount,
  accounts,
  categoryTree,
  costCenters,
  tags,
  trashCount,
}: TransactionsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição, fornecedor ou observação..."
          className="pl-9"
          value={filters.search ?? ""}
          onChange={(e) => onChange({ search: e.target.value })}
          aria-label="Buscar lançamentos"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.sortBy ?? "date"}
          onValueChange={(v) => onChange({ sortBy: v as TransactionListFilters["sortBy"] })}
        >
          <SelectTrigger className="w-[150px]" aria-label="Ordenar por">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Data</SelectItem>
            <SelectItem value="amount">Valor</SelectItem>
            <SelectItem value="description">Descrição</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sortDir ?? "desc"}
          onValueChange={(v) => onChange({ sortDir: v as "asc" | "desc" })}
        >
          <SelectTrigger className="w-[140px]" aria-label="Direção da ordenação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Maior / recente</SelectItem>
            <SelectItem value="asc">Menor / antigo</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant={activeCount > 0 ? "secondary" : "outline"} size="sm">
              <SlidersHorizontal className="size-4" />
              Filtros
              {activeCount > 0 && (
                <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px]">{activeCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3" align="end">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Filtros avançados</p>
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
                  <X className="size-3" /> Limpar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input
                  type="date"
                  value={filters.dateFrom ?? ""}
                  onChange={(e) => onChange({ dateFrom: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Input
                  type="date"
                  value={filters.dateTo ?? ""}
                  onChange={(e) => onChange({ dateTo: e.target.value || null })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Conta</Label>
              <Select
                value={filters.accountId ?? "todos"}
                onValueChange={(v) => onChange({ accountId: v })}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as contas</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select
                value={filters.categoryId ?? "todos"}
                onValueChange={(v) => onChange({ categoryId: v })}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  {categoryTree.flatMap((p) => [
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>,
                    ...p.children.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="pl-8">{c.name}</SelectItem>
                    )),
                  ])}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Centro de custo</Label>
              <Select
                value={filters.costCenterId ?? "todos"}
                onValueChange={(v) => onChange({ costCenterId: v })}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {costCenters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select
                value={filters.paymentMethod ?? "todos"}
                onValueChange={(v) => onChange({ paymentMethod: v as TransactionListFilters["paymentMethod"] })}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Valor mínimo</Label>
                <CurrencyInput
                  value={filters.amountMin ?? 0}
                  onChange={(v) => onChange({ amountMin: v > 0 ? v : null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor máximo</Label>
                <CurrencyInput
                  value={filters.amountMax ?? 0}
                  onChange={(v) => onChange({ amountMax: v > 0 ? v : null })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tags</Label>
              <TagMultiSelect
                tags={tags}
                value={filters.tagIds ?? []}
                onChange={(v) => onChange({ tagIds: v })}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={filters.onlyInstallments ? "secondary" : "outline"}
                size="sm"
                className="flex-1"
                aria-pressed={!!filters.onlyInstallments}
                onClick={() => onChange({ onlyInstallments: !filters.onlyInstallments })}
              >
                Parceladas
              </Button>
              <Button
                type="button"
                variant={filters.onlyRecurring ? "secondary" : "outline"}
                size="sm"
                className="flex-1"
                aria-pressed={!!filters.onlyRecurring}
                onClick={() => onChange({ onlyRecurring: !filters.onlyRecurring })}
              >
                Recorrentes
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant={filters.trashed ? "secondary" : "outline"}
          size="sm"
          onClick={() => onChange({ trashed: !filters.trashed })}
        >
          <Trash2 className="size-4" />
          Lixeira
          {trashCount > 0 && (
            <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 text-xs">{trashCount}</span>
          )}
        </Button>
      </div>
    </div>
  )
}
