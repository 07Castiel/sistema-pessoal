import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { loanSchema, LOAN_TYPE_OPTIONS, type LoanFormValues } from "@/schemas/loan.schema"
import { useCreateLoan, useUpdateLoan } from "@/hooks/use-loans"
import { useAuth } from "@/hooks/use-auth"
import { accountsService } from "@/services/accounts.service"
import { formatCurrency } from "@/lib/format"
import type { Loan } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

interface LoanFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan?: Loan | null
}

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULT_VALUES: LoanFormValues = {
  person_name: "",
  type: "recebido",
  principal_amount: 0,
  installments_total: 1,
  installment_amount: 0,
  start_date: today(),
  account_id: null,
  notes: null,
}

export function LoanFormDialog({ open, onOpenChange, loan }: LoanFormDialogProps) {
  const isEditing = !!loan
  const { user } = useAuth()
  const createLoan = useCreateLoan()
  const updateLoan = useUpdateLoan()
  const submitting = createLoan.isPending || updateLoan.isPending

  const { data: accountsResult } = useQuery({
    queryKey: ["accounts", "selectable", user?.id],
    queryFn: () => accountsService.list(user!.id, { status: "ativa", pageSize: 200 }),
    enabled: !!user && open,
  })
  const accounts = accountsResult?.data ?? []

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  const principal = useWatch({ control: form.control, name: "principal_amount" })
  const installmentsTotal = useWatch({ control: form.control, name: "installments_total" })

  useEffect(() => {
    if (!open) return
    if (loan) {
      form.reset({
        person_name: loan.person_name,
        type: loan.type,
        principal_amount: Number(loan.principal_amount),
        installments_total: loan.installments_total,
        installment_amount: Number(loan.installment_amount),
        start_date: loan.start_date,
        account_id: loan.account_id,
        notes: loan.notes,
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, loan, form])

  // Sugestão de valor de parcela = principal / N — o usuário pode ajustar
  // livremente (o acordo real pode incluir juros informais).
  function suggestInstallmentAmount() {
    if (principal > 0 && installmentsTotal > 0) {
      form.setValue("installment_amount", Math.round((principal / installmentsTotal) * 100) / 100)
    }
  }

  function onSubmit(values: LoanFormValues) {
    if (isEditing) {
      updateLoan.mutate({ id: loan.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createLoan.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar empréstimo" : "Novo empréstimo"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Só é possível editar informações gerais — valor e parcelas não mudam após criado."
              : "Empréstimo simples entre pessoas, sem sistema de amortização. As parcelas são geradas automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOAN_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="person_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pessoa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="principal_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor principal</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={suggestInstallmentAmount}
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="installments_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº de parcelas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={480}
                        value={field.value}
                        disabled={isEditing}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        onBlur={suggestInstallmentAmount}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="installment_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor de cada parcela</FormLabel>
                  <FormControl>
                    <CurrencyInput value={field.value} onChange={field.onChange} disabled={isEditing} />
                  </FormControl>
                  {installmentsTotal > 0 && field.value > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Total: {formatCurrency(field.value * installmentsTotal)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de início</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isEditing} {...field} />
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
                    <FormLabel>Conta associada (opcional)</FormLabel>
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
                        <SelectItem value="nenhuma">Nenhuma</SelectItem>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
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
                {isEditing ? "Salvar alterações" : "Criar empréstimo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
