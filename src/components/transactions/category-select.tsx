import { DynamicIcon } from "@/components/shared/dynamic-icon"
import type { CategoryNode } from "@/lib/category-tree"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CategorySelectProps {
  tree: CategoryNode[]
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * Categorias e subcategorias em um único select, agrupadas pelo pai.
 * Só recebe categorias já filtradas pelo tipo do lançamento.
 */
export function CategorySelect({ tree, value, onChange, disabled }: CategorySelectProps) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione uma categoria" />
      </SelectTrigger>
      <SelectContent>
        {tree.length === 0 && (
          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
            Nenhuma categoria disponível para este tipo.
          </div>
        )}
        {tree.map((parent) =>
          parent.children.length > 0 ? (
            <SelectGroup key={parent.id}>
              <SelectLabel className="flex items-center gap-1.5">
                <DynamicIcon
                  name={parent.icon}
                  className="size-3.5"
                  style={{ color: parent.color }}
                />
                {parent.name}
              </SelectLabel>
              <SelectItem value={parent.id}>{parent.name} (geral)</SelectItem>
              {parent.children.map((child) => (
                <SelectItem key={child.id} value={child.id} className="pl-8">
                  {child.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : (
            <SelectItem key={parent.id} value={parent.id}>
              <span className="flex items-center gap-2">
                <DynamicIcon
                  name={parent.icon}
                  className="size-3.5"
                  style={{ color: parent.color }}
                />
                {parent.name}
              </span>
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  )
}
