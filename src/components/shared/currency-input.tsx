import { forwardRef, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

function centsToDisplay(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function digitsToCents(digits: string) {
  const clean = digits.replace(/\D/g, "")
  return clean ? parseInt(clean, 10) : 0
}

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  onBlur?: () => void
  disabled?: boolean
  placeholder?: string
  id?: string
  "aria-invalid"?: boolean
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onChange, onBlur, disabled, placeholder, id, ...rest }, ref) {
    const [display, setDisplay] = useState(() => centsToDisplay(Math.round(value * 100)))

    useEffect(() => {
      setDisplay(centsToDisplay(Math.round(value * 100)))
    }, [value])

    return (
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <Input
          ref={ref}
          id={id}
          inputMode="decimal"
          disabled={disabled}
          placeholder={placeholder ?? "0,00"}
          className="pl-9 text-right tabular-nums"
          value={display}
          onChange={(e) => {
            const cents = digitsToCents(e.target.value)
            const formatted = centsToDisplay(cents)
            // Force the DOM value back in sync immediately so rapid input
            // (e.g. programmatic typing) can never compound on a stale
            // native value from before React re-renders.
            e.target.value = formatted
            setDisplay(formatted)
            onChange(cents / 100)
          }}
          onBlur={onBlur}
          {...rest}
        />
      </div>
    )
  }
)
