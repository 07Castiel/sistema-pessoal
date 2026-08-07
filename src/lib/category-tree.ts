import type { Category, CategoryType } from "@/types"

export interface CategoryNode extends Category {
  children: CategoryNode[]
}

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byParent = new Map<string, Category[]>()
  const roots: Category[] = []

  for (const category of categories) {
    if (category.parent_id) {
      const siblings = byParent.get(category.parent_id) ?? []
      siblings.push(category)
      byParent.set(category.parent_id, siblings)
    } else {
      roots.push(category)
    }
  }

  const sortBySortOrder = (items: Category[]) =>
    [...items].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR"))

  return sortBySortOrder(roots).map((root) => ({
    ...root,
    children: sortBySortOrder(byParent.get(root.id) ?? []).map((child) => ({
      ...child,
      children: [],
    })),
  }))
}

export function groupTreeByType(tree: CategoryNode[]): Record<CategoryType, CategoryNode[]> {
  return {
    receita: tree.filter((n) => n.type === "receita"),
    despesa: tree.filter((n) => n.type === "despesa"),
    transferencia: tree.filter((n) => n.type === "transferencia"),
    investimento: tree.filter((n) => n.type === "investimento"),
  }
}

export interface TrashedCategoryItem extends Category {
  parentName: string | null
}

/**
 * Flattens every soft-deleted category (top-level or subcategory) and
 * resolves each one's parent name from the FULL category list — so a
 * deleted subcategory still shows "Subcategoria de X" even though its
 * active parent isn't itself in the trash.
 */
export function buildTrashedList(allCategories: Category[]): TrashedCategoryItem[] {
  const byId = new Map(allCategories.map((c) => [c.id, c]))
  return allCategories
    .filter((c) => c.deleted_at !== null)
    .map((c) => ({
      ...c,
      parentName: c.parent_id ? (byId.get(c.parent_id)?.name ?? null) : null,
    }))
}

export function groupTrashedByType(
  items: TrashedCategoryItem[]
): Record<CategoryType, TrashedCategoryItem[]> {
  return {
    receita: items.filter((i) => i.type === "receita"),
    despesa: items.filter((i) => i.type === "despesa"),
    transferencia: items.filter((i) => i.type === "transferencia"),
    investimento: items.filter((i) => i.type === "investimento"),
  }
}

export function filterTrashedList(
  items: TrashedCategoryItem[],
  search: string
): TrashedCategoryItem[] {
  const term = search.trim().toLowerCase()
  if (!term) return items
  return items.filter((i) => i.name.toLowerCase().includes(term))
}

function matches(category: Category, term: string) {
  return category.name.toLowerCase().includes(term)
}

/** Filters a tree, keeping a parent whenever it matches or any of its children match. */
export function filterCategoryTree(tree: CategoryNode[], search: string): CategoryNode[] {
  const term = search.trim().toLowerCase()
  if (!term) return tree

  const result: CategoryNode[] = []
  for (const node of tree) {
    const selfMatches = matches(node, term)
    const matchingChildren = node.children.filter((child) => matches(child, term))
    if (selfMatches || matchingChildren.length > 0) {
      result.push({
        ...node,
        children: selfMatches ? node.children : matchingChildren,
      })
    }
  }
  return result
}
