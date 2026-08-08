import { useCallback, useMemo, useState } from "react"
import { PlusCircle, Tags as TagsIcon } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { useTagsQuery, useDeleteTag, useTagUsageBatch } from "@/hooks/use-tags"
import type { Tag } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TagRow } from "@/components/tags/tag-row"
import { TagFormDialog } from "@/components/tags/tag-form-dialog"

export default function TagsPage() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)

  const { data: tags, isLoading } = useTagsQuery()
  const tagIds = useMemo(() => (tags ?? []).map((t) => t.id), [tags])
  const { data: usage } = useTagUsageBatch(tagIds)
  const deleteTag = useDeleteTag()

  const filtered = (tags ?? []).filter((t) =>
    t.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const openCreateForm = useCallback(() => {
    setEditingTag(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEditForm = useCallback((tag: Tag) => {
    setEditingTag(tag)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const deleteUsage = usage?.[deleteTarget?.id ?? ""] ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Marcadores livres para organizar seus lançamentos além das categorias
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <PlusCircle className="size-4" />
          Nova tag
        </Button>
      </div>

      <Input
        placeholder="Pesquisar tag..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
        ) : filtered.length === 0 ? (
          debouncedSearch ? (
            <EmptyState icon={TagsIcon} title="Nenhuma tag encontrada" description="Tente ajustar a busca." />
          ) : (
            <EmptyState
              icon={TagsIcon}
              title="Nenhuma tag ainda"
              description="Crie tags para marcar lançamentos livremente, como 'Viagem' ou 'Urgente'."
              action={{ label: "Nova tag", onClick: openCreateForm }}
            />
          )
        ) : (
          filtered.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              usageCount={usage?.[tag.id] ?? 0}
              onEdit={openEditForm}
              onDelete={setDeleteTarget}
            />
          ))
        )}
      </div>

      <TagFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} tag={editingTag} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir tag"
        description={
          deleteUsage > 0
            ? `"${deleteTarget?.name}" está em uso em ${deleteUsage} ${deleteUsage === 1 ? "lançamento" : "lançamentos"}. Excluir a tag a remove desses lançamentos, sem afetá-los de outra forma. Essa ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir "${deleteTarget?.name}"? Essa ação não pode ser desfeita.`
        }
        destructive
        confirmLabel="Excluir"
        loading={deleteTag.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteTag.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
