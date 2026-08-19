import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { ChevronDown, Loader2, TrendingDown, TrendingUp } from "lucide-react"
import {
  transactionSchema,
  PAYMENT_METHOD_OPTIONS,
  RECURRENCE_FREQUENCY_OPTIONS,
  type TransactionFormValues,
} from "@/schemas/transaction.schema"
import { useTransactionLookups } from "@/hooks/use-transaction-lookups"
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/use-transactions"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TransactionEnriched, TransactionType } from "@/types"
import { CurrencyInput } from "@/components/shared/currency-input"
import { AttachmentsPanel } from "@/components/shared/attachments-panel"
import { CategorySelect } from "@/components/transactions/category-select"
import { TagMultiSelect } from "@/components/transactions/tag-multi-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: TransactionEnriched | null
  defaultType?: TransactionType
  /** Pré-preenche a partir de outro lançamento sem copiar id/status. */
  duplicateFrom?: TransactionEnriched | null
}

function buildDefaults(
  transaction: TransactionEnriched | null | undefined,
  duplicateFrom: TransactionEnriched | null | undefined,
  defaultType: TransactionType,
  lastAccountId: string | null
): TransactionFormValues {
  const source = transaction ?? duplicateFrom
  if (source) {
    const isDuplicate = !transaction
    return {
      type: source.type as TransactionType,
      description: source.description ?? "",
      amount: Number(source.amount ?? 0),
      account_id: source.account_id ?? "",
      category_id: source.category_id ?? "",
      cost_center_id: source.cost_center_id,
      // Ao duplicar, a data volta para hoje e o lançamento nasce pendente.
      date: isDuplicate ? today() : (source.date ?? today()),
      due_date: isDuplicate ? null : source.due_date,
      // paid_amount > 0 (parcial ou total) — o switch fica desabilitado
      // nesse caso (ver campo abaixo), então este valor é só informativo.
      settled: isDuplicate ? false : Number(source.paid_amount ?? 0) > 0,
      supplier: source.supplier,
      payment_method: source.payment_method,
      notes: source.notes,
      tag_ids: (source.tag_ids as string[] | null) ?? [],
      repeat: "none",
      installments: null,
      frequency: null,
      interval_days: null,
      end_date: null,
    }
  }
  return {
    type: defaultType,
    description: "",
    amount: 0,
    account_id: lastAccountId ?? "",
    category_id: "",
    cost_center_id: null,
    date: today(),
    due_date: null,
    settled: true,
    supplier: null,
    payment_method: null,
    notes: null,
    tag_ids: [],
    repeat: "none",
    installments: null,
    frequency: null,
    interval_days: null,
    end_date: null,
  }
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  defaultType = "despesa",
  duplicateFrom,
}: TransactionFormDialogProps) {
  const isEditing = !!transaction
  const [lastAccountId, setLastAccountId] = useLocalStorage<string | null>(
    "last-account-id",
    null
  )
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const submitting = createTransaction.isPending || updateTransaction.isPending

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: buildDefaults(transaction, duplicateFrom, defaultType, lastAccountId),
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  const type = useWatch({ control: form.control, name: "type" })
  const repeat = useWatch({ control: form.control, name: "repeat" })
  const frequency = useWatch({ control: form.control, name: "frequency" })
  const amount = useWatch({ control: form.control, name: "amount" })
  const installments = useWatch({ control: form.control, name: "installments" })

  const { accounts, categoryTree, tags, costCenters } = useTransactionLookups(type)
  const isIncome = type === "receita"
  const hasPayments = Number(transaction?.paid_amount ?? 0) > 0

  function onSubmit(values: TransactionFormValues) {
    setLastAccountId(values.account_id)
    if (isEditing) {
      updateTransaction.mutate(
        {
          id: transaction.id!,
          values,
          previouslyPaidAmount: Number(transaction.paid_amount ?? 0),
        },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createTransaction.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  const installmentPreview =
    repeat === "installments" && installments && installments >= 2 && amount > 0
      ? `${installments}x de ${formatCurrency(Math.trunc((amount / installments) * 100) / 100)} (última ajustada)`
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar lançamento" : duplicateFrom ? "Duplicar lançamento" : "Novo lançamento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações deste lançamento."
              : "Registre uma receita ou despesa. Os campos avançados são opcionais."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo: receita x despesa */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de lançamento">
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
                      O tipo não pode ser alterado. Exclua e crie um novo lançamento se necessário.
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Data <span className="text-destructive">*</span>
                    </FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Descrição <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isIncome ? "Ex: Salário de janeiro" : "Ex: Supermercado"}
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
                      <CategorySelect
                        tree={categoryTree}
                        value={field.value || null}
                        onChange={field.onChange}
                      />
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

            {/* Liquidação */}
            <FormField
              control={form.control}
              name="settled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel htmlFor="settled-switch">
                      {isIncome ? "Já recebida" : "Já paga"}
                    </FormLabel>
                    <FormDescription>
                      {hasPayments
                        ? "Este lançamento já tem pagamentos registrados — use o histórico de pagamentos para alterar isso."
                        : field.value
                          ? "O saldo da conta será atualizado imediatamente."
                          : "Ficará como pendente e não afetará o saldo."}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      id="settled-switch"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={repeat !== "none" || hasPayments}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Repetição */}
            {!isEditing && (
              <FormField
                control={form.control}
                name="repeat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repetição</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v)
                        if (v !== "none") form.setValue("settled", false)
                        if (v !== "installments") form.setValue("installments", null)
                        if (v !== "recurring") {
                          form.setValue("frequency", null)
                          form.setValue("interval_days", null)
                          form.setValue("end_date", null)
                        } else if (!form.getValues("frequency")) {
                          form.setValue("frequency", "mensal")
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Lançamento único</SelectItem>
                        <SelectItem value="installments">Parcelado</SelectItem>
                        <SelectItem value="recurring">Recorrente</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {repeat === "installments" && (
              <FormField
                control={form.control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Número de parcelas <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        max={480}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    {installmentPreview && (
                      <FormDescription>
                        {installmentPreview} — o valor informado é o total.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {repeat === "recurring" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Frequência <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione" />
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
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : null)
                            }
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
            )}

            {/* Campos avançados */}
            <div className="rounded-lg border">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                aria-expanded={advancedOpen}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
              >
                Campos avançados
                <ChevronDown
                  className={cn("size-4 text-muted-foreground transition-transform", advancedOpen && "rotate-180")}
                />
              </button>

              {advancedOpen && (
                <div className="space-y-3 border-t p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vencimento</FormLabel>
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
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isIncome ? "Pagador / fonte" : "Fornecedor"}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={isIncome ? "Ex: Empresa X" : "Ex: Mercado Y"}
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
                    name="tag_ids"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Tags</Label>
                        <FormControl>
                          <TagMultiSelect tags={tags} value={field.value} onChange={field.onChange} />
                        </FormControl>
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
                            placeholder="Anotações sobre este lançamento"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {isEditing && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">Anexos</p>
                <AttachmentsPanel entityType="transaction" entityId={transaction.id!} />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Salvar lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
