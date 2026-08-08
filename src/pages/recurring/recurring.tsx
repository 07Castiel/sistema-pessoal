import { useCallback, useMemo, useState } from "react"
import { PlusCircle, Repeat, RotateCcw as GenerateIcon } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { useCategoriesQuery } from "@/hooks/use-categories"
import { useAccountsQuery } from "@/hooks/use-accounts"
import {
  useRecurringRulesQuery,
  useTrashedRecurringRulesQuery,
  useRecurringRuleStats,
  useSetRecurringRuleActive,
  useEndRecurringRule,
  useSoftDeleteRecurringRule,
  useRestoreRecurringRule,
  useGenerateDueRecurrences,
} from "@/hooks/use-recurring-rules"
import type { RecurringRule } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCard } from "@/components/shared/kpi-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { RecurringRuleRow } from "@/components/recurring/recurring-rule-row"
import { RecurringRuleFormDialog } from "@/components/recurring/recurring-rule-form-dialog"

export default function RecurringPage() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [trashed, setTrashed] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null)
  const [endTarget, setEndTarget] = useState<RecurringRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecurringRule | null>(null)

  const { data: rules, isLoading } = useRecurringRulesQuery()
  // Sempre habilitado (não só quando a aba "Lixeira" está aberta): o KPI
  // "Na lixeira" precisa refletir a contagem real independente da aba ativa.
  const { data: trashedRules, isLoading: isLoadingTrashed } = useTrashedRecurringRulesQuery(true)
  const { data: categories } = useCategoriesQuery()
  const { data: accountsData } = useAccountsQuery({ pageSize: 200 })

  const ruleIds = useMemo(() => (rules ?? []).map((r) => r.id), [rules])
  const { data: stats } = useRecurringRuleStats(ruleIds)

  const setActive = useSetRecurringRuleActive()
  const endRule = useEndRecurringRule()
  const softDelete = useSoftDeleteRecurringRule()
  const restore = useRestoreRecurringRule()
  const generateDue = useGenerateDueRecurrences()

  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories]
  )
  const accountMap = useMemo(
    () => new Map((accountsData?.data ?? []).map((a) => [a.id, a])),
    [accountsData]
  )

  const openCreateForm = useCallback(() => {
    setEditingRule(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEditForm = useCallback((rule: RecurringRule) => {
    setEditingRule(rule)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const list = trashed ? (trashedRules ?? []) : (rules ?? [])
  const filtered = debouncedSearch
    ? list.filter((r) => r.description.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : list

  const activeCount = (rules ?? []).filter((r) => r.active).length
  const pausedCount = (rules ?? []).filter((r) => !r.active && r.end_date === null).length
  const loading = trashed ? isLoadingTrashed : isLoading

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recorrências</h1>
          <p className="text-sm text-muted-foreground">
            Contas recorrentes e assinaturas mensais/anuais
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => generateDue.mutate()}
            disabled={generateDue.isPending}
          >
            <GenerateIcon className="size-4" />
            Gerar agora
          </Button>
          <Button onClick={openCreateForm}>
            <PlusCircle className="size-4" />
            Nova recorrência
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Ativas" value={String(activeCount)} icon={Repeat} loading={isLoading} />
        <KpiCard label="Pausadas" value={String(pausedCount)} icon={Repeat} loading={isLoading} />
        <KpiCard
          label="Na lixeira"
          value={String(trashedRules?.length ?? 0)}
          icon={Repeat}
          loading={isLoadingTrashed}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Pesquisar por descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Tabs value={trashed ? "trash" : "all"} onValueChange={(v) => setTrashed(v === "trash")}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="trash">Lixeira</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
        ) : filtered.length === 0 ? (
          trashed ? (
            <EmptyState
              icon={Repeat}
              title="A lixeira está vazia"
              description="Recorrências excluídas aparecem aqui e podem ser restauradas."
            />
          ) : (
            <EmptyState
              icon={Repeat}
              title="Nenhuma recorrência"
              description="Crie um modelo para gerar lançamentos automaticamente a cada período."
              action={{ label: "Nova recorrência", onClick: openCreateForm }}
            />
          )
        ) : (
          filtered.map((rule) => (
            <RecurringRuleRow
              key={rule.id}
              rule={rule}
              category={categoryMap.get(rule.category_id ?? "")}
              account={accountMap.get(rule.account_id ?? "")}
              generatedCount={stats?.[rule.id]?.generatedCount ?? 0}
              lastOccurrenceDate={stats?.[rule.id]?.lastOccurrenceDate ?? null}
              trashed={trashed}
              onEdit={openEditForm}
              onTogglePause={(r) => setActive.mutate({ id: r.id, active: !r.active })}
              onEnd={setEndTarget}
              onDelete={setDeleteTarget}
              onRestore={(r) => restore.mutate(r.id)}
            />
          ))
        )}
      </div>

      <RecurringRuleFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} rule={editingRule} />

      <ConfirmDialog
        open={!!endTarget}
        onOpenChange={(open) => !open && setEndTarget(null)}
        title="Encerrar recorrência"
        description={`Tem certeza que deseja encerrar "${endTarget?.description}"? Nenhuma nova ocorrência será gerada, mas o histórico é mantido.`}
        confirmLabel="Encerrar"
        loading={endRule.isPending}
        onConfirm={() => {
          if (endTarget) endRule.mutate(endTarget.id, { onSettled: () => setEndTarget(null) })
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir recorrência"
        description={`Tem certeza que deseja excluir "${deleteTarget?.description}"? Ela será movida para a lixeira e poderá ser restaurada depois. Ocorrências já geradas não são afetadas.`}
        destructive
        confirmLabel="Excluir"
        loading={softDelete.isPending}
        onConfirm={() => {
          if (deleteTarget) softDelete.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
