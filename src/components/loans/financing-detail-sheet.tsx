import { useState } from "react"
import { Landmark } from "lucide-react"
import { useFinancingInstallmentsQuery, usePayFinancingInstallment } from "@/hooks/use-financings"
import { formatCurrency, formatPercent } from "@/lib/format"
import { AMORTIZATION_OPTIONS } from "@/schemas/financing.schema"
import type { Financing, FinancingInstallment } from "@/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { InstallmentRow } from "@/components/loans/installment-row"
import { InstallmentPaymentDialog } from "@/components/loans/installment-payment-dialog"

const AMORTIZATION_LABEL = Object.fromEntries(AMORTIZATION_OPTIONS.map((o) => [o.value, o.label]))

interface FinancingDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  financing: Financing | null
}

export function FinancingDetailSheet({ open, onOpenChange, financing }: FinancingDetailSheetProps) {
  const { data: installments, isLoading } = useFinancingInstallmentsQuery(open ? financing?.id : undefined)
  const payInstallment = usePayFinancingInstallment()
  const [payTarget, setPayTarget] = useState<FinancingInstallment | null>(null)

  if (!financing) return null

  // Mesmo raciocínio de loan-detail-sheet.tsx: progresso por contagem de
  // parcelas pagas, nunca por remaining_balance vs principal_amount (que
  // pode dar negativo por causa dos juros — ver debt-card.tsx).
  const paidCount = (installments ?? []).filter((i) => i.status === "pago").length
  const totalCount = financing.installments_total
  const paidPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Landmark className="size-4" /> {financing.name}
          </SheetTitle>
          <SheetDescription>
            {AMORTIZATION_LABEL[financing.amortization]} ·{" "}
            {formatCurrency(Number(financing.principal_amount))} em {financing.installments_total}x ·{" "}
            {formatPercent(Number(financing.interest_rate), 2)} a.m.
          </SheetDescription>
        </SheetHeader>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <p className="text-sm text-muted-foreground">Saldo devedor</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCurrency(Number(financing.remaining_balance))}
              </p>
            </div>
            <Progress value={paidPct} />
            <p className="text-xs text-muted-foreground">
              {paidCount} de {totalCount} parcelas pagas
            </p>
          </div>

          <p className="text-sm font-medium">Parcelas</p>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {(installments ?? []).map((installment) => (
                <InstallmentRow
                  key={installment.id}
                  number={installment.number}
                  dueDate={installment.due_date}
                  amount={Number(installment.amount)}
                  paidAmount={Number(installment.paid_amount)}
                  status={installment.status}
                  amortizationAmount={Number(installment.amortization_amount)}
                  interestAmount={Number(installment.interest_amount)}
                  onPay={() => setPayTarget(installment)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>

      {payTarget && (
        <InstallmentPaymentDialog
          open={!!payTarget}
          onOpenChange={(o) => !o && setPayTarget(null)}
          installmentNumber={payTarget.number}
          remainingForInstallment={Number(payTarget.amount) - Number(payTarget.paid_amount)}
          submitting={payInstallment.isPending}
          onSubmit={(values) => {
            payInstallment.mutate(
              { id: payTarget.id, values },
              { onSuccess: () => setPayTarget(null) }
            )
          }}
        />
      )}
    </Sheet>
  )
}
