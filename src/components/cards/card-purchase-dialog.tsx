import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { cardPurchaseSchema, type CardPurchaseFormValues } from "@/schemas/card-purchase.schema"
import { useTransactionLookups } from "@/hooks/use-transaction-lookups"
import { useCreateCardPurchase } from "@/hooks/use-card-invoices"
import type { CreditCard } from "@/types"
import { CurrencyInput } from "@/components/shared/currency-input"
import { CategorySelect } from "@/components/transactions/category-select"
import { TagMultiSelect } from "@/components/transactions/tag-multi-select"
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

const DEFAULT_VALUES: CardPurchaseFormValues = {
  description: "",
  amount: 0,
  date: today(),
  category_id: null,
  cost_center_id: null,
  supplier: null,
  notes: null,
  tag_ids: [],
}

interface CardPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CreditCard
}

export function CardPurchaseDialog({ open, onOpenChange, card }: CardPurchaseDialogProps) {
  const createPurchase = useCreateCardPurchase()
  const { categoryTree, tags, costCenters } = useTransactionLookups("despesa")

  const form = useForm<CardPurchaseFormValues>({
    resolver: zodResolver(cardPurchaseSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  function onSubmit(values: CardPurchaseFormValues) {
    createPurchase.mutate(
      { card, values },
      {
        onSuccess: () => {
          onOpenChange(false)
          form.reset(DEFAULT_VALUES)
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(DEFAULT_VALUES)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova compra — {card.name}</DialogTitle>
          <DialogDescription>
            A compra entra na fatura correspondente à data escolhida. Nenhuma conta é debitada
            agora — o saldo só é afetado quando a fatura for paga.
          </DialogDescription>
        </DialogHeader>

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
                      Data da compra <span className="text-destructive">*</span>
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
                    <Input placeholder="Ex: Supermercado" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Categoria <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <CategorySelect tree={categoryTree} value={field.value} onChange={field.onChange} />
                  </FormControl>
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
                    <FormLabel>Fornecedor (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Mercado Y"
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
                  <FormLabel>Tags</FormLabel>
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
              <Button type="submit" disabled={createPurchase.isPending}>
                {createPurchase.isPending && <Loader2 className="size-4 animate-spin" />}
                Lançar compra
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
