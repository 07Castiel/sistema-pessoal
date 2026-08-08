import { Check, TagIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tag } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TagMultiSelectProps {
  tags: Tag[]
  value: string[]
  onChange: (value: string[]) => void
}

export function TagMultiSelect({ tags, value, onChange }: TagMultiSelectProps) {
  const selected = tags.filter((t) => value.includes(t.id))

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-9 w-full justify-start gap-1.5 py-1.5 font-normal"
        >
          {selected.length === 0 ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <TagIcon className="size-4" /> Nenhuma tag
            </span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {selected.map((t) => (
                <Badge
                  key={t.id}
                  variant="secondary"
                  className="h-5 px-1.5 text-[11px]"
                  style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                >
                  {t.name}
                </Badge>
              ))}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {tags.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma tag cadastrada ainda.
          </p>
        ) : (
          <ScrollArea className="max-h-60">
            <ul className="p-1">
              {tags.map((tag) => {
                const isSelected = value.includes(tag.id)
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => toggle(tag.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                        isSelected && "bg-accent/60"
                      )}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 truncate">{tag.name}</span>
                      {isSelected && <Check className="size-3.5 shrink-0" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
