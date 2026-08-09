import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { financingSchema, AMORTIZATION_OPTIONS, type FinancingFormValues } from "@/schemas/financing.schema"
import { useCreateFinancing, useUpdateFinancing } from "@/hooks/use-financings"
import { useAuth } from "@/hooks/use-auth"
import { accountsService } from "@/services/accounts.service"
import { buildFinancingSchedule } from "@/lib/financing-schedule"
import { formatCurrency } from "@/lib/format"
import type { Financing } from "@/types"
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

interface FinancingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  financing?: Financing | null
}

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULT_VALUES: FinancingFormValues = {
  name: "",
  amortization: "price",
  principal_amount: 0,
  interest_rate: 0,
  installments_total: 12,
  start_date: today(),
  account_id: null,
  notes: null,
}

export function FinancingFormDialog({ open, onOpenChange, financing }: FinancingFormDialogProps) {
  const isEditing = !!financing
  const { user } = useAuth()
  const createFinancing = useCreateFinancing()
  const updateFinancing = useUpdateFinancing()
  const submitting = createFinancing.isPending || updateFinancing.isPending

  const { data: accountsResult } = useQuery({
    queryKey: ["accounts", "selectable", user?.id],
    queryFn: () => accountsService.list(user!.id, { status: "ativa", pageSize: 200 }),
    enabled: !!user && open,
  })
  const accounts = accountsResult?.data ?? []

  const form = useForm<FinancingFormValues>({
    resolver: zodResolver(financingSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  const amortization = useWatch({ control: form.control, name: "amortization" })
  const principal = useWatch({ control: form.control, name: "principal_amount" })
  const rate = useWatch({ control: form.control, name: "interest_rate" })
  const installmentsTotal = useWatch({ control: form.control, name: "installments_total" })

  useEffect(() => {
    if (!open) return
    if (financing) {
      form.reset({
        name: financing.name,
        amortization: financing.amortization,
        principal_amount: Number(financing.principal_amount),
        interest_rate: Number(financing.interest_rate),
        installments_total: financing.installments_total,
        start_date: financing.start_date,
        account_id: financing.account_id,
        notes: financing.notes,
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, financing, form])

  const preview = useMemo(() => {
    if (isEditing || principal <= 0 || installmentsTotal <= 0) return null
    try {
      const schedule = buildFinancingSchedule(amortization, today(), principal, rate, installmentsTotal)
      return { first: schedule[0], last: schedule[schedule.length - 1] }
    } catch {
      return null
    }
  }, [isEditing, amortization, principal, rate, installmentsTotal])

  function onSubmit(values: FinancingFormValues) {
    if (isEditing) {
      updateFinancing.mutate({ id: financing.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createFinancing.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar financiamento" : "Novo financiamento"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Só é possível editar informações gerais — valor, taxa e parcelas não mudam após criado."
              : "O cronograma de amortização é calculado e gerado automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Financiamento do carro" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amortization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amortização</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AMORTIZATION_OPTIONS.map((opt) => (
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
                name="interest_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa (% a.m.)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        disabled={isEditing}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
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
                    <FormLabel>Valor financiado</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} disabled={isEditing} />
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
                        disabled={isEditing}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {preview && (
              <p className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                1ª parcela: {formatCurrency(preview.first.amount)} · última:{" "}
                {formatCurrency(preview.last.amount)}
                {amortization === "price" && " (parcelas fixas)"}
              </p>
            )}

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
                {isEditing ? "Salvar alterações" : "Criar financiamento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
