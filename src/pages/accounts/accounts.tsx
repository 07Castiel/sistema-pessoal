import { useEffect, useState, useCallback } from "react"
import { PlusCircle, Wallet } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { useAccountsQuery, useSoftDeleteAccount, useRestoreAccount } from "@/hooks/use-accounts"
import type { AccountListFilters } from "@/repositories/accounts.repository"
import type { Account } from "@/types"
import { formatCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { KpiCard } from "@/components/shared/kpi-card"
import { PaginationBar } from "@/components/shared/pagination-bar"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { AccountsFilters } from "@/components/accounts/accounts-filters"
import { AccountRow } from "@/components/accounts/account-row"
import { AccountRowSkeleton } from "@/components/accounts/account-row-skeleton"
import { AccountsEmptyState } from "@/components/accounts/accounts-empty-state"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { ReconcileAccountDialog } from "@/components/accounts/reconcile-account-dialog"
import { AccountHistorySheet } from "@/components/accounts/account-history-sheet"

const PAGE_SIZE = 10

export default function AccountsPage() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [type, setType] = useState<NonNullable<AccountListFilters["type"]>>("todos")
  const [status, setStatus] = useState<NonNullable<AccountListFilters["status"]>>("todos")
  const [sortBy, setSortBy] = useState<NonNullable<AccountListFilters["sortBy"]>>("created_at")
  const [sortDir, setSortDir] = useState<NonNullable<AccountListFilters["sortDir"]>>("asc")
  const [trashed, setTrashed] = useState(false)
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const openCreateForm = useCallback(() => {
    setEditingAccount(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEditForm = useCallback((account: Account) => {
    setEditingAccount(account)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])
  const [reconcileTarget, setReconcileTarget] = useState<Account | null>(null)
  const [historyTarget, setHistoryTarget] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleTypeChange = useCallback((value: NonNullable<AccountListFilters["type"]>) => {
    setType(value)
    setPage(1)
  }, [])

  const handleStatusChange = useCallback((value: NonNullable<AccountListFilters["status"]>) => {
    setStatus(value)
    setPage(1)
  }, [])

  const handleTrashedChange = useCallback((value: boolean) => {
    setTrashed(value)
    setPage(1)
  }, [])

  const { data, isLoading, isFetching } = useAccountsQuery({
    search: debouncedSearch,
    type,
    status,
    trashed,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  })

  const { data: trashData } = useAccountsQuery({
    trashed: true,
    page: 1,
    pageSize: 1,
  })

  const softDelete = useSoftDeleteAccount()
  const restore = useRestoreAccount()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTyping = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable
      if (!isTyping && e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        openCreateForm()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [openCreateForm])

  const accounts = data?.data ?? []
  const total = data?.count ?? 0
  const activeAccountsTotal = accounts
    .filter((a) => a.status === "ativa")
    .reduce((sum, a) => sum + Number(a.current_balance), 0)
  const hasFilters = !!debouncedSearch || type !== "todos" || status !== "todos"

  function handleSort(nextSortBy: typeof sortBy) {
    if (nextSortBy === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(nextSortBy)
      setSortDir("asc")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas carteiras, bancos e investimentos
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <PlusCircle className="size-4" />
          Nova conta
          <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 text-[10px] opacity-70 sm:inline">
            N
          </kbd>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Saldo total (página atual)"
          value={formatCurrency(activeAccountsTotal)}
          icon={Wallet}
          loading={isLoading}
        />
        <KpiCard label="Contas ativas" value={String(total)} icon={Wallet} loading={isLoading} />
        <KpiCard
          label="Na lixeira"
          value={String(trashData?.count ?? 0)}
          icon={Wallet}
          loading={isLoading}
        />
      </div>

      <AccountsFilters
        search={search}
        onSearchChange={handleSearchChange}
        type={type}
        onTypeChange={handleTypeChange}
        status={status}
        onStatusChange={handleStatusChange}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={handleSort}
        trashed={trashed}
        onTrashedChange={handleTrashedChange}
        trashCount={trashData?.count ?? 0}
      />

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <AccountRowSkeleton key={i} />)
        ) : accounts.length === 0 ? (
          <AccountsEmptyState hasFilters={hasFilters} trashed={trashed} onCreate={openCreateForm} />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <div className="space-y-2">
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  trashed={trashed}
                  onEdit={openEditForm}
                  onDelete={setDeleteTarget}
                  onRestore={(a) => restore.mutate(a.id)}
                  onReconcile={setReconcileTarget}
                  onViewHistory={setHistoryTarget}
                />
              ))}
            </div>
            <PaginationBar page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>

      <AccountFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editingAccount}
      />

      <ReconcileAccountDialog
        open={!!reconcileTarget}
        onOpenChange={(open) => !open && setReconcileTarget(null)}
        account={reconcileTarget}
      />

      <AccountHistorySheet
        open={!!historyTarget}
        onOpenChange={(open) => !open && setHistoryTarget(null)}
        account={historyTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir conta"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Ela será movida para a lixeira e poderá ser restaurada depois.`}
        destructive
        confirmLabel="Excluir"
        loading={softDelete.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            softDelete.mutate(deleteTarget.id, {
              onSettled: () => setDeleteTarget(null),
            })
          }
        }}
      />
    </div>
  )
}
