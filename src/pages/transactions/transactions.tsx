import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  PlusCircle,
  Receipt,
  Scale,
  SearchX,
} from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { useTransactionLookups } from "@/hooks/use-transaction-lookups"
import {
  useTransactionsQuery,
  useTransactionTotals,
  useTrashedTransactionsCount,
  useSetTransactionStatus,
  useSoftDeleteTransaction,
  useRestoreTransaction,
} from "@/hooks/use-transactions"
import type { TransactionListFilters } from "@/repositories/transactions.repository"
import type { TransactionEnriched, TransactionType } from "@/types"
import { formatCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCard } from "@/components/shared/kpi-card"
import { EmptyState } from "@/components/shared/empty-state"
import { PaginationBar } from "@/components/shared/pagination-bar"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TransactionsFilters } from "@/components/transactions/transactions-filters"
import { TransactionRow } from "@/components/transactions/transaction-row"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { RegisterPaymentDialog } from "@/components/transactions/register-payment-dialog"
import { TransactionPaymentsSheet } from "@/components/transactions/transaction-payments-sheet"

const PAGE_SIZE = 20

const TABS: { value: string; label: string; patch: Partial<TransactionListFilters> }[] = [
  { value: "todos", label: "Todos", patch: { type: "todos", status: "todos" } },
  { value: "receitas", label: "Receitas", patch: { type: "receita", status: "todos" } },
  { value: "despesas", label: "Despesas", patch: { type: "despesa", status: "todos" } },
  { value: "pendentes", label: "Pendentes", patch: { type: "todos", status: "pendente" } },
  { value: "parciais", label: "Parciais", patch: { type: "todos", status: "parcial" } },
  { value: "atrasadas", label: "Atrasadas", patch: { type: "todos", status: "atrasado" } },
  { value: "canceladas", label: "Canceladas", patch: { type: "todos", status: "cancelado" } },
]

const INITIAL_FILTERS: TransactionListFilters = {
  search: "",
  type: "todos",
  status: "todos",
  accountId: "todos",
  categoryId: "todos",
  costCenterId: "todos",
  paymentMethod: "todos",
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  tagIds: [],
  onlyInstallments: false,
  onlyRecurring: false,
  trashed: false,
  sortBy: "date",
  sortDir: "desc",
  page: 1,
  pageSize: PAGE_SIZE,
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionListFilters>(INITIAL_FILTERS)
  const [tab, setTab] = useState("todos")
  const debouncedSearch = useDebounce(filters.search ?? "", 300)

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editing, setEditing] = useState<TransactionEnriched | null>(null)
  const [duplicating, setDuplicating] = useState<TransactionEnriched | null>(null)
  const [formType, setFormType] = useState<TransactionType>("despesa")
  const [deleteTarget, setDeleteTarget] = useState<TransactionEnriched | null>(null)
  const [cancelTarget, setCancelTarget] = useState<TransactionEnriched | null>(null)
  const [payTarget, setPayTarget] = useState<TransactionEnriched | null>(null)
  const [historyTarget, setHistoryTarget] = useState<TransactionEnriched | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  )

  const { data, isLoading, isFetching } = useTransactionsQuery(queryFilters)
  const { data: totals } = useTransactionTotals(queryFilters)
  const { data: trashCount = 0 } = useTrashedTransactionsCount()
  const lookups = useTransactionLookups(filters.type === "receita" ? "receita" : "despesa")

  const setStatus = useSetTransactionStatus()
  const softDelete = useSoftDeleteTransaction()
  const restore = useRestoreTransaction()

  const patchFilters = useCallback((patch: Partial<TransactionListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({ ...INITIAL_FILTERS, type: prev.type, status: prev.status }))
  }, [])

  const openCreate = useCallback((type: TransactionType) => {
    setEditing(null)
    setDuplicating(null)
    setFormType(type)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((t: TransactionEnriched) => {
    setEditing(t)
    setDuplicating(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openDuplicate = useCallback((t: TransactionEnriched) => {
    setEditing(null)
    setDuplicating(t)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  // Atalho: N abre um novo lançamento.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTyping =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable
      if (!isTyping && e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        openCreate("despesa")
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [openCreate])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (filters.accountId !== "todos") n++
    if (filters.categoryId !== "todos") n++
    if (filters.costCenterId !== "todos") n++
    if (filters.paymentMethod !== "todos") n++
    if (filters.dateFrom) n++
    if (filters.dateTo) n++
    if (filters.amountMin != null) n++
    if (filters.amountMax != null) n++
    if ((filters.tagIds ?? []).length > 0) n++
    if (filters.onlyInstallments) n++
    if (filters.onlyRecurring) n++
    return n
  }, [filters])

  const items = data?.data ?? []
  const total = data?.count ?? 0
  const hasSearchOrFilters = !!debouncedSearch || activeFilterCount > 0

  function openRegisterPayment(t: TransactionEnriched) {
    setPayTarget(t)
  }

  function openHistory(t: TransactionEnriched) {
    setHistoryTarget(t)
    setHistoryOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">Receitas e despesas em um só lugar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate("receita")}>
            <ArrowUpCircle className="size-4 text-success" /> Receita
          </Button>
          <Button onClick={() => openCreate("despesa")}>
            <PlusCircle className="size-4" />
            Despesa
            <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 text-[10px] opacity-70 sm:inline">
              N
            </kbd>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Receitas (recebido)"
          value={formatCurrency(totals?.income ?? 0)}
          icon={ArrowUpCircle}
          tone="success"
          loading={isLoading}
          hint={filters.dateFrom || filters.dateTo ? "No período filtrado" : "Todo o histórico"}
        />
        <KpiCard
          label="Despesas (pago)"
          value={formatCurrency(totals?.expense ?? 0)}
          icon={ArrowDownCircle}
          tone="destructive"
          loading={isLoading}
          hint={filters.dateFrom || filters.dateTo ? "No período filtrado" : "Todo o histórico"}
        />
        <KpiCard
          label="Resultado"
          value={formatCurrency(totals?.balance ?? 0)}
          icon={Scale}
          tone={(totals?.balance ?? 0) >= 0 ? "success" : "destructive"}
          loading={isLoading}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v)
          const found = TABS.find((x) => x.value === v)
          if (found) patchFilters({ ...found.patch, trashed: false })
        }}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <TransactionsFilters
        filters={filters}
        onChange={patchFilters}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        accounts={lookups.accounts}
        categoryTree={lookups.categoryTree}
        costCenters={lookups.costCenters}
        tags={lookups.tags}
        trashCount={trashCount}
      />

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
        ) : items.length === 0 ? (
          filters.trashed ? (
            <EmptyState
              icon={Receipt}
              title="A lixeira está vazia"
              description="Lançamentos excluídos aparecem aqui e podem ser restaurados a qualquer momento."
            />
          ) : hasSearchOrFilters ? (
            <EmptyState
              icon={SearchX}
              title="Nenhum lançamento encontrado"
              description="Tente ajustar a busca ou limpar os filtros aplicados."
              action={{ label: "Limpar filtros", onClick: clearFilters }}
            />
          ) : (
            <EmptyState
              icon={Receipt}
              tone="primary"
              title="Nenhum lançamento ainda"
              description="Registre sua primeira receita ou despesa para começar a acompanhar suas finanças."
              action={{ label: "Nova despesa", onClick: () => openCreate("despesa") }}
            />
          )
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <div className="space-y-2">
              {items.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  trashed={filters.trashed}
                  onEdit={openEdit}
                  onDuplicate={openDuplicate}
                  onRegisterPayment={openRegisterPayment}
                  onViewHistory={openHistory}
                  onReactivate={(x) => setStatus.mutate({ id: x.id!, status: "pendente" })}
                  onCancel={setCancelTarget}
                  onDelete={setDeleteTarget}
                  onRestore={(x) => restore.mutate(x.id!)}
                />
              ))}
            </div>
            <PaginationBar
              page={filters.page ?? 1}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            />
          </div>
        )}
      </div>

      <TransactionFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        duplicateFrom={duplicating}
        defaultType={formType}
      />

      {payTarget && (
        <RegisterPaymentDialog
          key={payTarget.id}
          open={!!payTarget}
          onOpenChange={(open) => !open && setPayTarget(null)}
          transaction={payTarget}
        />
      )}

      <TransactionPaymentsSheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        transaction={historyTarget}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancelar lançamento"
        description={`Cancelar "${cancelTarget?.description}"? O lançamento ficará marcado como cancelado.`}
        confirmLabel="Cancelar lançamento"
        cancelLabel="Voltar"
        loading={setStatus.isPending}
        onConfirm={() => {
          if (cancelTarget)
            setStatus.mutate(
              { id: cancelTarget.id!, status: "cancelado" },
              { onSettled: () => setCancelTarget(null) }
            )
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir lançamento"
        description={`Excluir "${deleteTarget?.description}"? Ele irá para a lixeira, o saldo será revertido e você poderá restaurá-lo depois.`}
        destructive
        confirmLabel="Excluir"
        loading={softDelete.isPending}
        onConfirm={() => {
          if (deleteTarget)
            softDelete.mutate(deleteTarget.id!, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
