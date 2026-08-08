import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Loader2, TrendingDown, TrendingUp } from "lucide-react"
import {
  recurringRuleSchema,
  type RecurringRuleFormValues,
} from "@/schemas/recurring-rule.schema"
import { PAYMENT_METHOD_OPTIONS, RECURRENCE_FREQUENCY_OPTIONS } from "@/schemas/transaction.schema"
import { useTransactionLookups } from "@/hooks/use-transaction-lookups"
import { useCreateRecurringRule, useUpdateRecurringRule } from "@/hooks/use-recurring-rules"
import { cn } from "@/lib/utils"
import type { RecurringRule, TransactionType } from "@/types"
import { CurrencyInput } from "@/components/shared/currency-input"
import { CategorySelect } from "@/components/transactions/category-select"
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const today = () => new Date().toISOString().slice(0, 10)

interface RecurringRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: RecurringRule | null
}

const DEFAULT_VALUES: RecurringRuleFormValues = {
  type: "despesa",
  description: "",
  amount: 0,
  account_id: "",
  category_id: "",
  cost_center_id: null,
  supplier: null,
  payment_method: null,
  notes: null,
  frequency: "mensal",
  interval_days: null,
  start_date: today(),
  end_date: null,
  lead_days: 0,
}

export function RecurringRuleFormDialog({ open, onOpenChange, rule }: RecurringRuleFormDialogProps) {
  const isEditing = !!rule
  const createRule = useCreateRecurringRule()
  const updateRule = useUpdateRecurringRule()
  const submitting = createRule.isPending || updateRule.isPending

  const form = useForm<RecurringRuleFormValues>({
    resolver: zodResolver(recurringRuleSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  const type = useWatch({ control: form.control, name: "type" })
  const frequency = useWatch({ control: form.control, name: "frequency" })
  const { accounts, categoryTree, costCenters } = useTransactionLookups(type as TransactionType)
  const isIncome = type === "receita"

  useEffect(() => {
    if (!open) return
    if (rule) {
      form.reset({
        type: rule.type as TransactionType,
        description: rule.description,
        amount: Number(rule.amount),
        account_id: rule.account_id ?? "",
        category_id: rule.category_id ?? "",
        cost_center_id: rule.cost_center_id,
        supplier: rule.supplier,
        payment_method: rule.payment_method,
        notes: rule.notes,
        frequency: rule.frequency,
        interval_days: rule.interval_days,
        start_date: rule.start_date,
        end_date: rule.end_date,
        lead_days: rule.lead_days,
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, rule, form])

  function onSubmit(values: RecurringRuleFormValues) {
    if (isEditing) {
      updateRule.mutate({ id: rule.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createRule.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar recorrência" : "Nova recorrência"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize o modelo. Ocorrências já geradas não são alteradas retroativamente."
              : "Crie um modelo de lançamento recorrente. As ocorrências vencidas são geradas sob demanda."}
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
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de recorrência">
                    <Button
                      type="button"
                      role="radio"
                      aria-checked={field.value === "receita"}
                      variant="outline"
                      disabled={isEditing}
                      onClick={() => {
                        field.onChange("receita")
                        form.setValue("category_id", "")
                      }}
                      className={cn(
                        field.value === "receita" &&
                          "border-success bg-success/10 text-success hover:bg-success/15 hover:text-success"
                      )}
                    >
                      <TrendingUp className="size-4" /> Receita
                    </Button>
                    <Button
                      type="button"
                      role="radio"
                      aria-checked={field.value === "despesa"}
                      variant="outline"
                      disabled={isEditing}
                      onClick={() => {
                        field.onChange("despesa")
                        form.setValue("category_id", "")
                      }}
                      className={cn(
                        field.value === "despesa" &&
                          "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive"
                      )}
                    >
                      <TrendingDown className="size-4" /> Despesa
                    </Button>
                  </div>
                  {isEditing && (
                    <FormDescription>
                      O tipo não pode ser alterado. Encerre e crie uma nova recorrência se necessário.
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Início <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isEditing} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Descrição <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isIncome ? "Ex: Salário" : "Ex: Aluguel"}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Categoria <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <CategorySelect tree={categoryTree} value={field.value || null} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Conta <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Frequência <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RECURRENCE_FREQUENCY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {frequency === "personalizada" ? (
                <FormField
                  control={form.control}
                  name="interval_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        A cada (dias) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Termina em (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="lead_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gerar com antecedência (dias)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Quantos dias antes do vencimento a ocorrência já pode ser gerada.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isIncome ? "Pagador / fonte" : "Fornecedor"}</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_center_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de custo</FormLabel>
                    <Select
                      value={field.value ?? "nenhum"}
                      onValueChange={(v) => field.onChange(v === "nenhum" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        {costCenters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isIncome ? "Forma de recebimento" : "Forma de pagamento"}</FormLabel>
                  <Select
                    value={field.value ?? "nenhuma"}
                    onValueChange={(v) => field.onChange(v === "nenhuma" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="nenhuma">Não informada</SelectItem>
                      {PAYMENT_METHOD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
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
                {isEditing ? "Salvar alterações" : "Criar recorrência"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
