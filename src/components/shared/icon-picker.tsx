import { DynamicIcon } from "@/components/shared/dynamic-icon"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  color?: string
}

export function IconPicker({ value, onChange, options, color = "#6366f1" }: IconPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="size-10 shrink-0 p-0"
          style={{ color }}
          aria-label="Selecionar ícone"
        >
          <DynamicIcon name={value} className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="grid grid-cols-6 gap-1">
          {options.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => onChange(icon)}
              className={cn(
                "flex size-9 items-center justify-center rounded-md ring-1 ring-transparent transition-colors hover:bg-accent",
                value === icon && "bg-accent ring-current"
              )}
              aria-label={icon}
              aria-pressed={value === icon}
            >
              <DynamicIcon name={icon} className="size-4" style={{ color }} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
