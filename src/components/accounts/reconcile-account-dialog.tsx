import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Loader2, Scale } from "lucide-react"
import {
  reconcileAccountSchema,
  type ReconcileAccountFormValues,
} from "@/schemas/account.schema"
import { useReconcileAccount } from "@/hooks/use-accounts"
import { formatCurrency } from "@/lib/format"
import type { Account } from "@/types"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/shared/currency-input"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export function ReconcileAccountDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
}) {
  const reconcile = useReconcileAccount()

  const form = useForm<ReconcileAccountFormValues>({
    resolver: zodResolver(reconcileAccountSchema),
    defaultValues: { statement_balance: 0, notes: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  useEffect(() => {
    if (open && account) {
      form.reset({ statement_balance: Number(account.current_balance), notes: "" })
    }
  }, [open, account, form])

  const statementBalance = useWatch({ control: form.control, name: "statement_balance" })
  const difference = account ? statementBalance - Number(account.current_balance) : 0

  function onSubmit(values: ReconcileAccountFormValues) {
    if (!account) return
    reconcile.mutate(
      { accountId: account.id, statementBalance: values.statement_balance, notes: values.notes },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="size-4" /> Reconciliar conta
          </DialogTitle>
          <DialogDescription>
            Informe o saldo exibido no extrato de <strong>{account?.name}</strong>. Se houver
            diferença, um lançamento de ajuste será criado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo atual no sistema</span>
                <span className="tabular-nums">
                  {formatCurrency(Number(account?.current_balance ?? 0))}
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="statement_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo no extrato</FormLabel>
                  <FormControl>
                    <CurrencyInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {difference !== 0 && (
              <p className={difference > 0 ? "text-sm text-success" : "text-sm text-destructive"}>
                Ajuste de {formatCurrency(difference)} será lançado como{" "}
                {difference > 0 ? "receita" : "despesa"}.
              </p>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Ex: diferença de tarifa bancária" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={reconcile.isPending}>
                {reconcile.isPending && <Loader2 className="size-4 animate-spin" />}
                Reconciliar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
