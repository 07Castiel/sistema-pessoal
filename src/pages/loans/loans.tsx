import { useCallback, useMemo, useState } from "react"
import { HandCoins, Landmark, PlusCircle, Wallet } from "lucide-react"
import { useLoansQuery, useDeleteLoan } from "@/hooks/use-loans"
import { useFinancingsQuery, useDeleteFinancing } from "@/hooks/use-financings"
import type { Financing, Loan } from "@/types"
import { formatCurrency } from "@/lib/format"
import { LOAN_TYPE_OPTIONS } from "@/schemas/loan.schema"
import { AMORTIZATION_OPTIONS } from "@/schemas/financing.schema"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCard } from "@/components/shared/kpi-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DebtCard } from "@/components/loans/debt-card"
import { LoanFormDialog } from "@/components/loans/loan-form-dialog"
import { LoanDetailSheet } from "@/components/loans/loan-detail-sheet"
import { FinancingFormDialog } from "@/components/loans/financing-form-dialog"
import { FinancingDetailSheet } from "@/components/loans/financing-detail-sheet"

const TYPE_LABEL = Object.fromEntries(LOAN_TYPE_OPTIONS.map((o) => [o.value, o.label]))
const AMORTIZATION_LABEL = Object.fromEntries(AMORTIZATION_OPTIONS.map((o) => [o.value, o.label]))

export default function LoansPage() {
  const [tab, setTab] = useState<"emprestimos" | "financiamentos">("emprestimos")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Empréstimos e Financiamentos</h1>
        <p className="text-sm text-muted-foreground">
          Empréstimos simples entre pessoas e financiamentos com amortização (SAC/Price)
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="emprestimos">Empréstimos</TabsTrigger>
          <TabsTrigger value="financiamentos">Financiamentos</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "emprestimos" ? <LoansTab /> : <FinancingsTab />}
    </div>
  )
}

function LoansTab() {
  const { data: loans, isLoading } = useLoansQuery()
  const deleteLoan = useDeleteLoan()

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [openLoanId, setOpenLoanId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null)

  const openLoan = (loans ?? []).find((l) => l.id === openLoanId) ?? null

  const openCreate = useCallback(() => {
    setEditingLoan(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])
  const openEdit = useCallback((loan: Loan) => {
    setEditingLoan(loan)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const totals = useMemo(() => {
    const list = loans ?? []
    const receivable = list.filter((l) => l.type === "concedido" && l.status !== "quitado" && l.status !== "cancelado")
    const payable = list.filter((l) => l.type === "recebido" && l.status !== "quitado" && l.status !== "cancelado")
    return {
      receivable: receivable.reduce((s, l) => s + Number(l.remaining_balance), 0),
      payable: payable.reduce((s, l) => s + Number(l.remaining_balance), 0),
    }
  }, [loans])

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <PlusCircle className="size-4" /> Novo empréstimo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="A receber" value={formatCurrency(totals.receivable)} icon={Wallet} tone="success" loading={isLoading} />
        <KpiCard label="A pagar" value={formatCurrency(totals.payable)} icon={Wallet} tone="destructive" loading={isLoading} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (loans ?? []).length === 0 ? (
        <EmptyState
          icon={HandCoins}
          tone="primary"
          title="Nenhum empréstimo cadastrado"
          description="Registre dinheiro emprestado ou recebido de outras pessoas."
          action={{ label: "Novo empréstimo", onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(loans ?? []).map((loan) => (
            <DebtCard
              key={loan.id}
              icon={HandCoins}
              title={loan.person_name}
              subtitle={`${TYPE_LABEL[loan.type]} · ${loan.installments_total}x`}
              principal={Number(loan.principal_amount)}
              remainingBalance={Number(loan.remaining_balance)}
              status={loan.status}
              onOpen={() => setOpenLoanId(loan.id)}
              onEdit={() => openEdit(loan)}
              onDelete={() => setDeleteTarget(loan)}
            />
          ))}
        </div>
      )}

      <LoanFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} loan={editingLoan} />
      <LoanDetailSheet open={!!openLoan} onOpenChange={(o) => !o && setOpenLoanId(null)} loan={openLoan} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir empréstimo"
        description={`Excluir o empréstimo com "${deleteTarget?.person_name}"? Todas as parcelas serão removidas permanentemente.`}
        destructive
        confirmLabel="Excluir"
        loading={deleteLoan.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteLoan.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}

function FinancingsTab() {
  const { data: financings, isLoading } = useFinancingsQuery()
  const deleteFinancing = useDeleteFinancing()

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingFinancing, setEditingFinancing] = useState<Financing | null>(null)
  const [openFinancingId, setOpenFinancingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Financing | null>(null)

  const openFinancing = (financings ?? []).find((f) => f.id === openFinancingId) ?? null

  const openCreate = useCallback(() => {
    setEditingFinancing(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])
  const openEdit = useCallback((financing: Financing) => {
    setEditingFinancing(financing)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const totalRemaining = useMemo(
    () => (financings ?? []).reduce((s, f) => s + Number(f.remaining_balance), 0),
    [financings]
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <PlusCircle className="size-4" /> Novo financiamento
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Saldo devedor total" value={formatCurrency(totalRemaining)} icon={Landmark} tone="destructive" loading={isLoading} />
        <KpiCard label="Financiamentos ativos" value={String((financings ?? []).filter((f) => f.status !== "quitado").length)} icon={Landmark} loading={isLoading} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (financings ?? []).length === 0 ? (
        <EmptyState
          icon={Landmark}
          tone="primary"
          title="Nenhum financiamento cadastrado"
          description="Registre um financiamento (SAC ou Price) para acompanhar o cronograma de amortização."
          action={{ label: "Novo financiamento", onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(financings ?? []).map((financing) => (
            <DebtCard
              key={financing.id}
              icon={Landmark}
              title={financing.name}
              subtitle={`${AMORTIZATION_LABEL[financing.amortization]} · ${financing.installments_total}x`}
              principal={Number(financing.principal_amount)}
              remainingBalance={Number(financing.remaining_balance)}
              status={financing.status}
              onOpen={() => setOpenFinancingId(financing.id)}
              onEdit={() => openEdit(financing)}
              onDelete={() => setDeleteTarget(financing)}
            />
          ))}
        </div>
      )}

      <FinancingFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} financing={editingFinancing} />
      <FinancingDetailSheet
        open={!!openFinancing}
        onOpenChange={(o) => !o && setOpenFinancingId(null)}
        financing={openFinancing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir financiamento"
        description={`Excluir "${deleteTarget?.name}"? Todas as parcelas serão removidas permanentemente.`}
        destructive
        confirmLabel="Excluir"
        loading={deleteFinancing.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteFinancing.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
