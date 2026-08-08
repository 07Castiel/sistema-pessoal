import { useCallback, useMemo, useState } from "react"
import { FolderKanban, PlusCircle } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import {
  useCostCentersQuery,
  useCostCenterUsageBatch,
  useSetCostCenterActive,
  useDeleteCostCenter,
} from "@/hooks/use-cost-centers"
import type { CostCenter } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { CostCenterRow } from "@/components/cost-centers/cost-center-row"
import { CostCenterFormDialog } from "@/components/cost-centers/cost-center-form-dialog"

type StatusFilter = "todos" | "ativos" | "inativos"

export default function CostCentersPage() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [status, setStatus] = useState<StatusFilter>("todos")

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editing, setEditing] = useState<CostCenter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CostCenter | null>(null)

  const { data: costCenters, isLoading } = useCostCentersQuery()
  const ids = useMemo(() => (costCenters ?? []).map((c) => c.id), [costCenters])
  const { data: usage } = useCostCenterUsageBatch(ids)
  const setActive = useSetCostCenterActive()
  const deleteCostCenter = useDeleteCostCenter()

  const filtered = (costCenters ?? []).filter((c) => {
    if (status === "ativos" && !c.active) return false
    if (status === "inativos" && c.active) return false
    return c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  })

  const openCreateForm = useCallback(() => {
    setEditing(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEditForm = useCallback((costCenter: CostCenter) => {
    setEditing(costCenter)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const deleteUsage = usage?.[deleteTarget?.id ?? ""] ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Custos</h1>
          <p className="text-sm text-muted-foreground">
            Agrupe despesas por projeto, obra ou qualquer critério seu
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <PlusCircle className="size-4" />
          Novo centro de custo
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Pesquisar centro de custo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="ativos">Ativos</TabsTrigger>
            <TabsTrigger value="inativos">Inativos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
        ) : filtered.length === 0 ? (
          debouncedSearch || status !== "todos" ? (
            <EmptyState
              icon={FolderKanban}
              title="Nenhum centro de custo encontrado"
              description="Tente ajustar a busca ou o filtro."
            />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="Nenhum centro de custo ainda"
              description="Crie centros de custo para agrupar despesas por projeto, obra ou pessoa."
              action={{ label: "Novo centro de custo", onClick: openCreateForm }}
            />
          )
        ) : (
          filtered.map((costCenter) => (
            <CostCenterRow
              key={costCenter.id}
              costCenter={costCenter}
              usageCount={usage?.[costCenter.id] ?? 0}
              onEdit={openEditForm}
              onToggleActive={(c) => setActive.mutate({ id: c.id, active: !c.active })}
              onDelete={setDeleteTarget}
            />
          ))
        )}
      </div>

      <CostCenterFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} costCenter={editing} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir centro de custo"
        description={
          deleteUsage > 0
            ? `"${deleteTarget?.name}" está em uso em ${deleteUsage} ${deleteUsage === 1 ? "lançamento" : "lançamentos"}. Excluir o centro de custo apenas remove essa referência dos lançamentos, sem afetá-los de outra forma. Essa ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir "${deleteTarget?.name}"? Essa ação não pode ser desfeita.`
        }
        destructive
        confirmLabel="Excluir"
        loading={deleteCostCenter.isPending}
        onConfirm={() => {
          if (deleteTarget)
            deleteCostCenter.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
