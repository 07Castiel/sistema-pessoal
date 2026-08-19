import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { useTransactionPaymentsQuery, useDeleteTransactionPayment } from "@/hooks/use-transaction-payments"
import { calculateRemainingAmount } from "@/lib/transaction-payments"
import { formatCurrency, formatDate } from "@/lib/format"
import { PAYMENT_METHOD_OPTIONS } from "@/schemas/transaction.schema"
import type { TransactionEnriched, TransactionPayment } from "@/types"
import { RegisterPaymentDialog } from "@/components/transactions/register-payment-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label])
)

interface TransactionPaymentsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: TransactionEnriched | null
}

/** Histórico de pagamentos de um lançamento — cada movimentação
 * individual, editável e excluível, com recálculo automático (via trigger
 * de banco) refletido assim que a mutação invalida a query. */
export function TransactionPaymentsSheet({
  open,
  onOpenChange,
  transaction,
}: TransactionPaymentsSheetProps) {
  const [editingPayment, setEditingPayment] = useState<TransactionPayment | null>(null)
  const [deleting, setDeleting] = useState<TransactionPayment | null>(null)

  const { data: payments, isLoading } = useTransactionPaymentsQuery(
    open ? (transaction?.id ?? undefined) : undefined
  )
  const deletePayment = useDeleteTransactionPayment()

  const isIncome = transaction?.type === "receita"
  const amount = Number(transaction?.amount ?? 0)
  const paidAmount = Number(transaction?.paid_amount ?? 0)
  const remaining = calculateRemainingAmount(amount, paidAmount)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Histórico de pagamentos</SheetTitle>
            <SheetDescription>{transaction?.description}</SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-3 gap-3 border-b px-5 py-3 text-sm">
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium tabular-nums">{formatCurrency(amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{isIncome ? "Recebido" : "Pago"}</p>
              <p className="font-medium tabular-nums">{formatCurrency(paidAmount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Restante</p>
              <p className="font-medium tabular-nums">{formatCurrency(remaining)}</p>
            </div>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-3">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !payments || payments.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum pagamento registrado ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium tabular-nums">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.date)}
                        {payment.payment_method &&
                          ` · ${PAYMENT_METHOD_LABEL[payment.payment_method] ?? payment.payment_method}`}
                      </p>
                      {payment.notes && (
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Editar pagamento"
                        onClick={() => setEditingPayment(payment)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label="Excluir pagamento"
                        onClick={() => setDeleting(payment)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {editingPayment && transaction && (
        <RegisterPaymentDialog
          key={editingPayment.id}
          open={!!editingPayment}
          onOpenChange={(o) => !o && setEditingPayment(null)}
          transaction={transaction}
          payment={editingPayment}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir pagamento"
        description={
          deleting
            ? `Tem certeza que deseja excluir este pagamento de ${formatCurrency(Number(deleting.amount))}? Essa ação alterará o saldo e o status deste lançamento.`
            : ""
        }
        confirmLabel="Excluir"
        destructive
        loading={deletePayment.isPending}
        onConfirm={() => {
          if (!deleting || !transaction?.id) return
          deletePayment.mutate(
            { id: deleting.id, transactionId: transaction.id },
            { onSuccess: () => setDeleting(null) }
          )
        }}
      />
    </>
  )
}
