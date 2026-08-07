import { useCallback, useEffect, useMemo, useState } from "react"
import { PlusCircle, Tags } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import {
  useCategoriesQuery,
  useCategoryTree,
  useTrashedCategories,
  useRestoreCategory,
  useReorderCategories,
} from "@/hooks/use-categories"
import type { Category, CategoryType } from "@/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { CategoriesFilters } from "@/components/categories/categories-filters"
import { CategoryTypeSection } from "@/components/categories/category-type-section"
import { TrashedTypeSection } from "@/components/categories/trashed-type-section"
import { CategoryFormDialog } from "@/components/categories/category-form-dialog"
import { DeleteCategoryDialog } from "@/components/categories/delete-category-dialog"

const SECTION_ORDER: CategoryType[] = ["receita", "despesa", "transferencia", "investimento"]

export default function CategoriesPage() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [trashed, setTrashed] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formDefaultType, setFormDefaultType] = useState<CategoryType>("despesa")
  const [formDefaultParentId, setFormDefaultParentId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const { data: categories, isLoading } = useCategoriesQuery()
  const grouped = useCategoryTree(categories, debouncedSearch)
  const trashedGrouped = useTrashedCategories(categories, debouncedSearch)
  const reorder = useReorderCategories()
  const restore = useRestoreCategory()

  const trashCount = useMemo(
    () => (categories ?? []).filter((c) => c.deleted_at !== null).length,
    [categories]
  )

  const openCreateForm = useCallback((type: CategoryType, parentId: string | null = null) => {
    setEditingCategory(null)
    setFormDefaultType(type)
    setFormDefaultParentId(parentId)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEditForm = useCallback((category: Category) => {
    setEditingCategory(category)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTyping = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable
      if (!isTyping && e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        openCreateForm("despesa")
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [openCreateForm])

  const hasActiveResults = SECTION_ORDER.some((type) => grouped[type].length > 0)
  const hasTrashedResults = SECTION_ORDER.some((type) => trashedGrouped[type].length > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Organize suas categorias e subcategorias por tipo
          </p>
        </div>
        <Button onClick={() => openCreateForm("despesa")}>
          <PlusCircle className="size-4" />
          Nova categoria
          <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 text-[10px] opacity-70 sm:inline">
            N
          </kbd>
        </Button>
      </div>

      <CategoriesFilters
        search={search}
        onSearchChange={setSearch}
        trashed={trashed}
        onTrashedChange={setTrashed}
        trashCount={trashCount}
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : trashed ? (
        trashCount === 0 ? (
          <EmptyState
            icon={Tags}
            title="A lixeira está vazia"
            description="Categorias excluídas aparecem aqui e podem ser restauradas a qualquer momento."
          />
        ) : !hasTrashedResults ? (
          <EmptyState icon={Tags} title="Nenhuma categoria encontrada" description="Tente ajustar a busca." />
        ) : (
          <div className="space-y-4">
            {SECTION_ORDER.map((type) => (
              <TrashedTypeSection
                key={type}
                type={type}
                items={trashedGrouped[type]}
                onRestore={(item) => restore.mutate(item.id)}
              />
            ))}
          </div>
        )
      ) : !hasActiveResults && debouncedSearch ? (
        <EmptyState icon={Tags} title="Nenhuma categoria encontrada" description="Tente ajustar a busca." />
      ) : (
        <div className="space-y-4">
          {SECTION_ORDER.map((type) => (
            <CategoryTypeSection
              key={type}
              type={type}
              nodes={grouped[type]}
              autoExpand={!!debouncedSearch}
              onEdit={openEditForm}
              onDelete={setDeleteTarget}
              onAddSubcategory={(parent) => openCreateForm(parent.type, parent.id)}
              onCreate={(t) => openCreateForm(t)}
              onReorderRoots={(ids) => reorder.mutate(ids)}
              onReorderChildren={(_parentId, ids) => reorder.mutate(ids)}
            />
          ))}
        </div>
      )}

      <CategoryFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        categories={categories ?? []}
        defaultType={formDefaultType}
        defaultParentId={formDefaultParentId}
      />

      <DeleteCategoryDialog category={deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} />
    </div>
  )
}
