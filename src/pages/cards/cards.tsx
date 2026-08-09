import { useCallback, useMemo, useState } from "react"
import { CreditCard as CreditCardIcon, PlusCircle, Wallet } from "lucide-react"
import {
  useCreditCardsQuery,
  useCardUsageQuery,
  useSetCreditCardStatus,
  useDeleteCreditCard,
} from "@/hooks/use-credit-cards"
import type { CreditCard } from "@/types"
import { formatCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { KpiCard } from "@/components/shared/kpi-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { CreditCardVisual } from "@/components/cards/credit-card-visual"
import { CreditCardFormDialog } from "@/components/cards/credit-card-form-dialog"
import { InvoiceDetailSheet } from "@/components/cards/invoice-detail-sheet"

export default function CardsPage() {
  const { data: cards, isLoading } = useCreditCardsQuery()
  const { data: usage } = useCardUsageQuery()
  const setStatus = useSetCreditCardStatus()
  const deleteCard = useDeleteCreditCard()

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [openCard, setOpenCard] = useState<CreditCard | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CreditCard | null>(null)

  const usageByCard = useMemo(() => new Map((usage ?? []).map((u) => [u.card_id, u])), [usage])

  const openCreate = useCallback(() => {
    setEditingCard(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((card: CreditCard) => {
    setEditingCard(card)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }, [])

  const totals = useMemo(() => {
    const list = usage ?? []
    return {
      limit: list.reduce((sum, u) => sum + Number(u.credit_limit ?? 0), 0),
      used: list.reduce((sum, u) => sum + Number(u.used_amount ?? 0), 0),
      available: list.reduce((sum, u) => sum + Number(u.available_limit ?? 0), 0),
    }
  }, [usage])

  const activeCards = (cards ?? []).filter((c) => c.status !== "arquivada")
  const archivedCards = (cards ?? []).filter((c) => c.status === "arquivada")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cartões</h1>
          <p className="text-sm text-muted-foreground">Limite, faturas e compras dos seus cartões</p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="size-4" /> Novo cartão
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Limite total" value={formatCurrency(totals.limit)} icon={Wallet} loading={isLoading} />
        <KpiCard
          label="Usado (faturas em aberto)"
          value={formatCurrency(totals.used)}
          icon={CreditCardIcon}
          tone="destructive"
          loading={isLoading}
        />
        <KpiCard
          label="Disponível"
          value={formatCurrency(totals.available)}
          icon={Wallet}
          tone="success"
          loading={isLoading}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (cards ?? []).length === 0 ? (
        <EmptyState
          icon={CreditCardIcon}
          tone="primary"
          title="Nenhum cartão cadastrado"
          description="Cadastre um cartão de crédito para acompanhar limite, faturas e compras."
          action={{ label: "Novo cartão", onClick: openCreate }}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeCards.map((card) => (
              <CreditCardVisual
                key={card.id}
                card={card}
                usage={usageByCard.get(card.id)}
                onOpen={setOpenCard}
                onEdit={openEdit}
                onArchiveToggle={(c) =>
                  setStatus.mutate({ id: c.id, status: "arquivada" })
                }
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          {archivedCards.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Arquivados</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archivedCards.map((card) => (
                  <CreditCardVisual
                    key={card.id}
                    card={card}
                    usage={usageByCard.get(card.id)}
                    onOpen={setOpenCard}
                    onEdit={openEdit}
                    onArchiveToggle={(c) => setStatus.mutate({ id: c.id, status: "ativa" })}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CreditCardFormDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} card={editingCard} />

      <InvoiceDetailSheet
        open={!!openCard}
        onOpenChange={(open) => !open && setOpenCard(null)}
        card={openCard}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir cartão"
        description={`Excluir "${deleteTarget?.name}"? As faturas deste cartão serão removidas. Transações já lançadas não são apagadas — apenas perdem o vínculo com o cartão.`}
        destructive
        confirmLabel="Excluir"
        loading={deleteCard.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteCard.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
