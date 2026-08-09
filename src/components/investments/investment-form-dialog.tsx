import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import {
  investmentSchema,
  INVESTMENT_TYPE_OPTIONS,
  type InvestmentFormValues,
} from "@/schemas/investment.schema"
import { useCreateInvestment, useUpdateInvestment } from "@/hooks/use-investments"
import { useAuth } from "@/hooks/use-auth"
import { accountsService } from "@/services/accounts.service"
import type { Investment } from "@/types"
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

interface InvestmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment?: Investment | null
}

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULT_VALUES: InvestmentFormValues = {
  name: "",
  type: "cdb",
  institution: null,
  application_date: today(),
  maturity_date: null,
  liquidity: null,
  rate_description: null,
  account_id: null,
  notes: null,
}

export function InvestmentFormDialog({ open, onOpenChange, investment }: InvestmentFormDialogProps) {
  const isEditing = !!investment
  const { user } = useAuth()
  const createInvestment = useCreateInvestment()
  const updateInvestment = useUpdateInvestment()
  const submitting = createInvestment.isPending || updateInvestment.isPending

  const { data: accountsResult } = useQuery({
    queryKey: ["accounts", "selectable", user?.id],
    queryFn: () => accountsService.list(user!.id, { status: "ativa", pageSize: 200 }),
    enabled: !!user && open,
  })
  const accounts = accountsResult?.data ?? []

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  useEffect(() => {
    if (!open) return
    if (investment) {
      form.reset({
        name: investment.name,
        type: investment.type,
        institution: investment.institution,
        application_date: investment.application_date,
        maturity_date: investment.maturity_date,
        liquidity: investment.liquidity,
        rate_description: investment.rate_description,
        account_id: investment.account_id,
        notes: investment.notes,
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, investment, form])

  function onSubmit(values: InvestmentFormValues) {
    if (isEditing) {
      updateInvestment.mutate({ id: investment.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createInvestment.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar investimento" : "Novo investimento"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações deste investimento."
              : "Cadastre um investimento. Os valores aplicado e atual começam em zero — registre um aporte depois de criar."}
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
                    <Input placeholder="Ex: Tesouro Selic 2029" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INVESTMENT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
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
                name="institution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instituição (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: XP, Nubank..."
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
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
                name="application_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de aplicação</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maturity_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento (opcional)</FormLabel>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="liquidity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liquidez (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: D+0, No vencimento..."
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
                name="rate_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rentabilidade (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 110% do CDI"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isEditing ? "Salvar alterações" : "Criar investimento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
