import { Check } from "lucide-react"
import { COLOR_PRESETS } from "@/constants/colors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="size-10 shrink-0 p-0"
          aria-label="Selecionar cor"
        >
          <span className="size-5 rounded-full border" style={{ backgroundColor: value }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="grid grid-cols-8 gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className="flex size-6 items-center justify-center rounded-full"
              style={{ backgroundColor: preset }}
              aria-label={preset}
              aria-pressed={value === preset}
            >
              {value.toLowerCase() === preset.toLowerCase() && (
                <Check className="size-3.5 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn("h-8 flex-1 font-mono text-xs uppercase")}
            maxLength={7}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
