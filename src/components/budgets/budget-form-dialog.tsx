import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { budgetSchema, MONTH_OPTIONS, type BudgetFormValues } from "@/schemas/budget.schema"
import { useCreateBudget, useUpdateBudget, type BudgetPeriod } from "@/hooks/use-budgets"
import { useCategoriesQuery } from "@/hooks/use-categories"
import { buildCategoryTree } from "@/lib/category-tree"
import { CategorySelect } from "@/components/transactions/category-select"
import type { Budget } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/shared/currency-input"
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

interface BudgetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget?: Budget | null
  defaultPeriod: BudgetPeriod
}

export function BudgetFormDialog({ open, onOpenChange, budget, defaultPeriod }: BudgetFormDialogProps) {
  const isEditing = !!budget
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const submitting = createBudget.isPending || updateBudget.isPending

  const { data: categories } = useCategoriesQuery()
  const expenseTree = useMemo(() => {
    const active = (categories ?? []).filter((c) => c.type === "despesa" && c.deleted_at === null)
    return buildCategoryTree(active)
  }, [categories])

  const defaultValues: BudgetFormValues = useMemo(
    () => ({
      category_id: "",
      month: defaultPeriod.month,
      year: defaultPeriod.year,
      planned_amount: 0,
    }),
    [defaultPeriod]
  )

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  useEffect(() => {
    if (!open) return
    if (budget) {
      form.reset({
        category_id: budget.category_id,
        month: budget.month,
        year: budget.year,
        planned_amount: Number(budget.planned_amount),
      })
    } else {
      form.reset(defaultValues)
    }
  }, [open, budget, defaultValues, form])

  function onSubmit(values: BudgetFormValues) {
    if (isEditing) {
      updateBudget.mutate({ id: budget.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createBudget.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize o valor planejado, a categoria ou o período deste orçamento."
              : "Defina quanto pretende gastar em uma categoria durante um mês."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <CategorySelect tree={expenseTree} value={field.value || null} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mês</FormLabel>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTH_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="planned_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor planejado</FormLabel>
                  <FormControl>
                    <CurrencyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
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
                {isEditing ? "Salvar alterações" : "Criar orçamento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
