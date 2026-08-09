import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import {
  installmentPaymentSchema,
  type InstallmentPaymentFormValues,
} from "@/schemas/installment-payment.schema"
import { formatCurrency } from "@/lib/format"
import { CurrencyInput } from "@/components/shared/currency-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface InstallmentPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  installmentNumber: number
  remainingForInstallment: number
  onSubmit: (values: InstallmentPaymentFormValues) => void
  submitting: boolean
}

/** Compartilhado entre Empréstimos e Financiamentos — o valor informado é
 * somado ao `paid_amount` já registrado (pagamento parcial suportado pelo
 * schema, ver installment-payment.schema.ts). */
export function InstallmentPaymentDialog({
  open,
  onOpenChange,
  installmentNumber,
  remainingForInstallment,
  onSubmit,
  submitting,
}: InstallmentPaymentDialogProps) {
  const form = useForm<InstallmentPaymentFormValues>({
    resolver: zodResolver(installmentPaymentSchema),
    defaultValues: { amount: remainingForInstallment, paid_date: today() },
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  useEffect(() => {
    if (open) form.reset({ amount: remainingForInstallment, paid_date: today() })
  }, [open, remainingForInstallment, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pagamento — Parcela {installmentNumber}</DialogTitle>
          <DialogDescription>
            Restam {formatCurrency(remainingForInstallment)} nesta parcela. Informe um valor menor
            para registrar um pagamento parcial.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor pago</FormLabel>
                  <FormControl>
                    <CurrencyInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paid_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do pagamento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
