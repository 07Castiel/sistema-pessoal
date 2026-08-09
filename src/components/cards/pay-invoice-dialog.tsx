import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { usePayInvoice } from "@/hooks/use-card-invoices"
import { useAuth } from "@/hooks/use-auth"
import { accountsService } from "@/services/accounts.service"
import { formatCurrency } from "@/lib/format"
import type { CardInvoice, CreditCard } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PayInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CreditCard
  invoice: CardInvoice
}

export function PayInvoiceDialog({ open, onOpenChange, card, invoice }: PayInvoiceDialogProps) {
  const { user } = useAuth()
  const payInvoice = usePayInvoice()
  const [accountId, setAccountId] = useState<string>(card.account_id ?? "")

  const { data: accountsResult } = useQuery({
    queryKey: ["accounts", "selectable", user?.id],
    queryFn: () => accountsService.list(user!.id, { status: "ativa", pageSize: 200 }),
    enabled: !!user && open,
  })
  const accounts = accountsResult?.data ?? []
  const total = Number(invoice.total_amount)

  function handleConfirm() {
    if (!accountId) return
    payInvoice.mutate(
      { card, invoiceId: invoice.id, accountId, totalAmount: total },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar fatura — {card.name}</DialogTitle>
          <DialogDescription>
            Registra uma despesa de {formatCurrency(total)} na conta escolhida e marca a fatura
            como paga. O saldo da conta é debitado imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Pagar com a conta</Label>
          <Select value={accountId || undefined} onValueChange={setAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma conta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!accountId || total <= 0 || payInvoice.isPending}
            onClick={handleConfirm}
          >
            {payInvoice.isPending && <Loader2 className="size-4 animate-spin" />}
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
