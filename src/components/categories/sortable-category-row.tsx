import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CategoryRow } from "@/components/categories/category-row"
import type { Category } from "@/types"

interface SortableCategoryRowProps {
  category: Category
  childCount?: number
  expanded?: boolean
  onToggleExpand?: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onAddSubcategory?: (category: Category) => void
}

export function SortableCategoryRow(props: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.category.id,
  })

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <CategoryRow {...props} dragHandleProps={{ attributes, listeners }} isDragging={isDragging} />
    </div>
  )
}
