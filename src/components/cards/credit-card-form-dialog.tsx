import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import {
  creditCardSchema,
  CARD_BRAND_OPTIONS,
  type CreditCardFormValues,
} from "@/schemas/credit-card.schema"
import { CREDIT_CARD_ICON_OPTIONS } from "@/constants/icon-registry"
import { useCreateCreditCard, useUpdateCreditCard } from "@/hooks/use-credit-cards"
import { useAuth } from "@/hooks/use-auth"
import { accountsService } from "@/services/accounts.service"
import type { CreditCard } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/shared/currency-input"
import { IconPicker } from "@/components/shared/icon-picker"
import { ColorPicker } from "@/components/shared/color-picker"
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

interface CreditCardFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: CreditCard | null
}

const DEFAULT_VALUES: CreditCardFormValues = {
  name: "",
  bank: "",
  brand: "outro",
  color: "#6366f1",
  icon: "credit-card",
  credit_limit: 0,
  closing_day: 1,
  due_day: 10,
  account_id: null,
  status: "ativa",
}

export function CreditCardFormDialog({ open, onOpenChange, card }: CreditCardFormDialogProps) {
  const isEditing = !!card
  const { user } = useAuth()
  const createCard = useCreateCreditCard()
  const updateCard = useUpdateCreditCard()
  const submitting = createCard.isPending || updateCard.isPending

  const { data: accountsResult } = useQuery({
    queryKey: ["accounts", "selectable", user?.id],
    queryFn: () => accountsService.list(user!.id, { status: "ativa", pageSize: 200 }),
    enabled: !!user && open,
  })
  const accounts = accountsResult?.data ?? []

  const form = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })
  const watchedColor = useWatch({ control: form.control, name: "color" })

  useEffect(() => {
    if (!open) return
    if (card) {
      form.reset({
        name: card.name,
        bank: card.bank ?? "",
        brand: card.brand,
        color: card.color,
        icon: card.icon,
        credit_limit: Number(card.credit_limit),
        closing_day: card.closing_day,
        due_day: card.due_day,
        account_id: card.account_id,
        status: card.status,
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, card, form])

  function onSubmit(values: CreditCardFormValues) {
    if (isEditing) {
      updateCard.mutate({ id: card.id, values }, { onSuccess: () => onOpenChange(false) })
    } else {
      createCard.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do seu cartão de crédito."
              : "Cadastre um cartão de crédito para acompanhar limite e faturas."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-end gap-3">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <FormControl>
                      <IconPicker
                        value={field.value}
                        onChange={field.onChange}
                        options={CREDIT_CARD_ICON_OPTIONS}
                        color={watchedColor}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Nubank Ultravioleta" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bandeira</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CARD_BRAND_OPTIONS.map((opt) => (
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
                name="bank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banco (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Nubank" value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="credit_limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite total</FormLabel>
                  <FormControl>
                    <CurrencyInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="closing_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de fechamento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de vencimento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativa">Ativo</SelectItem>
                        <SelectItem value="inativa">Inativo</SelectItem>
                        <SelectItem value="arquivada">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Criar cartão"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
