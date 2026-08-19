import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import {
  buildTransactionPaymentSchema,
  type TransactionPaymentFormValues,
} from "@/schemas/transaction-payment.schema"
import { PAYMENT_METHOD_OPTIONS } from "@/schemas/transaction.schema"
import {
  useCreateTransactionPayment,
  useUpdateTransactionPayment,
} from "@/hooks/use-transaction-payments"
import { calculateRemainingAmount } from "@/lib/transaction-payments"
import { formatCurrency } from "@/lib/format"
import type { TransactionEnriched, TransactionPayment, TransactionType } from "@/types"
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

interface RegisterPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: TransactionEnriched
  /** Presente = editando um pagamento existente; ausente = registrando um novo. */
  payment?: TransactionPayment | null
}

/**
 * "Registrar pagamento"/"Registrar recebimento" (criação) ou "Editar
 * pagamento"/"Editar recebimento" (`payment` informado) — o valor vem
 * pré-preenchido com o saldo restante na criação, ou com o valor atual do
 * pagamento na edição. O pai deve montar este componente com uma `key`
 * ligada ao alvo (transação + pagamento, se houver) — garante que o schema
 * (que carrega o teto de valor válido no momento da abertura) e os valores
 * default sejam sempre calculados do zero para o alvo certo, mesmo espírito
 * do padrão `key={formKey}` já usado em `TransactionFormDialog`.
 */
export function RegisterPaymentDialog({
  open,
  onOpenChange,
  transaction,
  payment,
}: RegisterPaymentDialogProps) {
  const isEditing = !!payment
  const isIncome = transaction.type === "receita"
  const amount = Number(transaction.amount ?? 0)
  const paidAmount = Number(transaction.paid_amount ?? 0)
  const remaining = calculateRemainingAmount(amount, paidAmount)
  // Editando, o teto de validação "devolve" o valor atual do pagamento ao
  // saldo restante antes de validar o novo valor — mesma regra da trigger
  // `validate_transaction_payment` (soma as outras movimentações, excluindo
  // a própria linha sendo editada).
  const ceiling = isEditing
    ? calculateRemainingAmount(amount, paidAmount - Number(payment!.amount))
    : remaining

  const form = useForm<TransactionPaymentFormValues>({
    resolver: zodResolver(buildTransactionPaymentSchema(ceiling)),
    defaultValues: isEditing
      ? {
          amount: Number(payment!.amount),
          date: payment!.date,
          payment_method: payment!.payment_method,
          notes: payment!.notes,
        }
      : {
          amount: remaining,
          date: today(),
          payment_method: null,
          notes: null,
        },
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  const createPayment = useCreateTransactionPayment()
  const updatePayment = useUpdateTransactionPayment()
  const submitting = createPayment.isPending || updatePayment.isPending

  function onSubmit(values: TransactionPaymentFormValues) {
    if (isEditing) {
      updatePayment.mutate(
        { id: payment!.id, transactionId: transaction.id!, values },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createPayment.mutate(
        {
          transactionId: transaction.id!,
          type: transaction.type as TransactionType,
          values,
        },
        { onSuccess: () => onOpenChange(false) }
      )
    }
  }

  const title = isEditing
    ? isIncome
      ? "Editar recebimento"
      : "Editar pagamento"
    : isIncome
      ? "Registrar recebimento"
      : "Registrar pagamento"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{transaction.description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
          <div>
            <p className="text-muted-foreground">Valor total</p>
            <p className="font-medium tabular-nums">{formatCurrency(amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{isIncome ? "Já recebido" : "Já pago"}</p>
            <p className="font-medium tabular-nums">{formatCurrency(paidAmount)}</p>
          </div>
          <div className="col-span-2 border-t pt-3">
            <p className="text-muted-foreground">Saldo restante</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(remaining)}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Ex: Entrada, segunda parcela..."
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
                {title}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
