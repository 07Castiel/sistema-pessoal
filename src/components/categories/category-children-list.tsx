import { DndContext } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { SortableCategoryRow } from "@/components/categories/sortable-category-row"
import { useSortableList, sortableScreenReaderInstructions } from "@/hooks/use-sortable-list"
import type { CategoryNode } from "@/lib/category-tree"
import type { Category } from "@/types"

interface CategoryChildrenListProps {
  parentId: string
  children: CategoryNode[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onReorder: (parentId: string, orderedIds: string[]) => void
}

export function CategoryChildrenList({
  parentId,
  children,
  onEdit,
  onDelete,
  onReorder,
}: CategoryChildrenListProps) {
  const ids = children.map((c) => c.id)
  const { sensors, announcements, handleDragEnd } = useSortableList(ids, (orderedIds) =>
    onReorder(parentId, orderedIds)
  )

  if (children.length === 0) return null

  return (
    <div className="space-y-2 pl-1">
      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements, screenReaderInstructions: sortableScreenReaderInstructions }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {children.map((child) => (
            <SortableCategoryRow key={child.id} category={child} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
