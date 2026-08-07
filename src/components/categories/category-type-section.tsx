import { useState } from "react"
import { DndContext } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ChevronDown, Plus } from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { SortableCategoryRow } from "@/components/categories/sortable-category-row"
import { CategoryChildrenList } from "@/components/categories/category-children-list"
import { useSortableList, sortableScreenReaderInstructions } from "@/hooks/use-sortable-list"
import { cn } from "@/lib/utils"
import type { CategoryNode } from "@/lib/category-tree"
import type { Category, CategoryType } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const TYPE_META: Record<CategoryType, { label: string; icon: string; color: string }> = {
  receita: { label: "Receitas", icon: "trending-up", color: "var(--success)" },
  despesa: { label: "Despesas", icon: "shopping-bag", color: "var(--destructive)" },
  transferencia: { label: "Transferências", icon: "arrow-left-right", color: "#0ea5e9" },
  investimento: { label: "Investimentos", icon: "trending-up", color: "var(--chart-1)" },
}

interface CategoryTypeSectionProps {
  type: CategoryType
  nodes: CategoryNode[]
  autoExpand: boolean
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onAddSubcategory: (category: Category) => void
  onCreate: (type: CategoryType) => void
  onReorderRoots: (orderedIds: string[]) => void
  onReorderChildren: (parentId: string, orderedIds: string[]) => void
}

export function CategoryTypeSection({
  type,
  nodes,
  autoExpand,
  onEdit,
  onDelete,
  onAddSubcategory,
  onCreate,
  onReorderRoots,
  onReorderChildren,
}: CategoryTypeSectionProps) {
  const meta = TYPE_META[type]
  const [collapsed, setCollapsed] = useState(false)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  const rootIds = nodes.map((n) => n.id)
  const { sensors, announcements, handleDragEnd } = useSortableList(rootIds, onReorderRoots)
  const totalCount = nodes.reduce((sum, n) => sum + 1 + n.children.length, 0)

  function isExpanded(id: string) {
    return autoExpand || expandedParents.has(id)
  }

  function toggleExpand(id: string) {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex w-full items-center gap-2.5 px-4 py-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCollapsed((c) => !c)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setCollapsed((c) => !c)
            }
          }}
          className="flex flex-1 cursor-pointer items-center gap-2.5 text-left outline-none"
          aria-expanded={!collapsed}
        >
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
          >
            <DynamicIcon name={meta.icon} className="size-3.5" />
          </div>
          <span className="font-medium">{meta.label}</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
            {totalCount}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCreate(type)}
          aria-label={`Nova categoria de ${meta.label.toLowerCase()}`}
          title={`Nova categoria de ${meta.label.toLowerCase()}`}
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Nova categoria</span>
        </Button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
          className="flex size-6 items-center justify-center text-muted-foreground"
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} />
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2 border-t p-3">
          {nodes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {autoExpand
                ? `Nenhum resultado em ${meta.label.toLowerCase()}.`
                : `Nenhuma categoria de ${meta.label.toLowerCase()} ainda.`}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
              accessibility={{
                announcements,
                screenReaderInstructions: sortableScreenReaderInstructions,
              }}
            >
              <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
                {nodes.map((node) => (
                  <div key={node.id} className="space-y-2">
                    <SortableCategoryRow
                      category={node}
                      childCount={node.children.length}
                      expanded={isExpanded(node.id)}
                      onToggleExpand={() => toggleExpand(node.id)}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddSubcategory={onAddSubcategory}
                    />
                    {isExpanded(node.id) && (
                      <CategoryChildrenList
                        parentId={node.id}
                        children={node.children}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onReorder={onReorderChildren}
                      />
                    )}
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}
