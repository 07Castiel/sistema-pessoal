import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import {
  investmentMovementSchema,
  MOVEMENT_TYPE_OPTIONS,
  type InvestmentMovementFormValues,
} from "@/schemas/investment.schema"
import { useCreateInvestmentMovement, useUpdateInvestmentMovement } from "@/hooks/use-investment-movements"
import type { Investment, InvestmentMovement } from "@/types"
import { CurrencyInput } from "@/components/shared/currency-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULT_VALUES: InvestmentMovementFormValues = {
  type: "aporte",
  amount: 0,
  date: today(),
  notes: null,
}

interface InvestmentMovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment: Investment
  movement?: InvestmentMovement | null
}

export function InvestmentMovementDialog({
  open,
  onOpenChange,
  investment,
  movement,
}: InvestmentMovementDialogProps) {
  const isEditing = !!movement
  const createMovement = useCreateInvestmentMovement()
  const updateMovement = useUpdateInvestmentMovement()
  const submitting = createMovement.isPending || updateMovement.isPending

  const form = useForm<InvestmentMovementFormValues>({
    resolver: zodResolver(investmentMovementSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  useEffect(() => {
    if (!open) return
    if (movement) {
      form.reset({
        type: movement.type,
        amount: Number(movement.amount),
        date: movement.date,
        notes: movement.notes,
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, movement, form])

  function onSubmit(values: InvestmentMovementFormValues) {
    if (isEditing) {
      updateMovement.mutate({ id: movement.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createMovement.mutate(
        { investmentId: investment.id, values },
        { onSuccess: () => onOpenChange(false) }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar movimentação" : "Nova movimentação"} — {investment.name}</DialogTitle>
          <DialogDescription>
            Aporte e rendimento aumentam o valor atual; resgate diminui.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOVEMENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
