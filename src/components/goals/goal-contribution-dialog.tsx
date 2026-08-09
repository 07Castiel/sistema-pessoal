import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { goalContributionSchema, type GoalContributionFormValues } from "@/schemas/goal.schema"
import { useCreateGoalContribution } from "@/hooks/use-goal-contributions"
import type { Goal } from "@/types"
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

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULT_VALUES: GoalContributionFormValues = {
  kind: "aporte",
  amount: 0,
  date: today(),
  notes: null,
}

interface GoalContributionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
}

export function GoalContributionDialog({ open, onOpenChange, goal }: GoalContributionDialogProps) {
  const createContribution = useCreateGoalContribution()

  const form = useForm<GoalContributionFormValues>({
    resolver: zodResolver(goalContributionSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  function onSubmit(values: GoalContributionFormValues) {
    createContribution.mutate(
      { goalId: goal.id, values },
      {
        onSuccess: () => {
          onOpenChange(false)
          form.reset(DEFAULT_VALUES)
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(DEFAULT_VALUES)
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Movimentar — {goal.name}</DialogTitle>
          <DialogDescription>Registre um aporte ou uma retirada desta meta.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de movimentação">
                    <Button
                      type="button"
                      role="radio"
                      aria-checked={field.value === "aporte"}
                      variant={field.value === "aporte" ? "default" : "outline"}
                      onClick={() => field.onChange("aporte")}
                    >
                      Aporte
                    </Button>
                    <Button
                      type="button"
                      role="radio"
                      aria-checked={field.value === "retirada"}
                      variant={field.value === "retirada" ? "default" : "outline"}
                      onClick={() => field.onChange("retirada")}
                    >
                      Retirada
                    </Button>
                  </div>
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
              <Button type="submit" disabled={createContribution.isPending}>
                {createContribution.isPending && <Loader2 className="size-4 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
