import { useState } from "react"
import { HandCoins } from "lucide-react"
import { useLoanInstallmentsQuery, usePayLoanInstallment } from "@/hooks/use-loans"
import { formatCurrency } from "@/lib/format"
import { LOAN_TYPE_OPTIONS } from "@/schemas/loan.schema"
import type { Loan, LoanInstallment } from "@/types"
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

const TYPE_LABEL = Object.fromEntries(LOAN_TYPE_OPTIONS.map((o) => [o.value, o.label]))

interface LoanDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
}

export function LoanDetailSheet({ open, onOpenChange, loan }: LoanDetailSheetProps) {
  const { data: installments, isLoading } = useLoanInstallmentsQuery(open ? loan?.id : undefined)
  const payInstallment = usePayLoanInstallment()
  const [payTarget, setPayTarget] = useState<LoanInstallment | null>(null)

  if (!loan) return null

  // Progresso por contagem de parcelas pagas — sempre entre 0 e 100%,
  // diferente de comparar remaining_balance com principal_amount (que
  // pode dar negativo quando há juros embutidos na parcela, ver
  // debt-card.tsx).
  const paidCount = (installments ?? []).filter((i) => i.status === "pago").length
  const totalCount = loan.installments_total
  const paidPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <HandCoins className="size-4" /> {loan.person_name}
          </SheetTitle>
          <SheetDescription>
            {TYPE_LABEL[loan.type]} · {formatCurrency(Number(loan.principal_amount))} em{" "}
            {loan.installments_total}x
          </SheetDescription>
        </SheetHeader>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <p className="text-sm text-muted-foreground">Saldo devedor</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCurrency(Number(loan.remaining_balance))}
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
