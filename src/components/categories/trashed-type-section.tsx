import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { TrashedCategoryRow } from "@/components/categories/trashed-category-row"
import { cn } from "@/lib/utils"
import type { TrashedCategoryItem } from "@/lib/category-tree"
import type { CategoryType } from "@/types"
import { Badge } from "@/components/ui/badge"

const TYPE_META: Record<CategoryType, { label: string; icon: string; color: string }> = {
  receita: { label: "Receitas", icon: "trending-up", color: "var(--success)" },
  despesa: { label: "Despesas", icon: "shopping-bag", color: "var(--destructive)" },
  transferencia: { label: "Transferências", icon: "arrow-left-right", color: "#0ea5e9" },
  investimento: { label: "Investimentos", icon: "trending-up", color: "var(--chart-1)" },
}

export function TrashedTypeSection({
  type,
  items,
  onRestore,
}: {
  type: CategoryType
  items: TrashedCategoryItem[]
  onRestore: (item: TrashedCategoryItem) => void
}) {
  const meta = TYPE_META[type]
  const [collapsed, setCollapsed] = useState(false)

  if (items.length === 0) return null

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
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
          {items.length}
        </Badge>
        <div className="flex-1" />
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
      </button>

      {!collapsed && (
        <div className="space-y-2 border-t p-3">
          {items.map((item) => (
            <TrashedCategoryRow key={item.id} item={item} onRestore={onRestore} />
          ))}
        </div>
      )}
    </div>
  )
}
