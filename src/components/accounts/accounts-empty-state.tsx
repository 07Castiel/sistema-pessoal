import { SearchX, Wallet } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"

export function AccountsEmptyState({
  hasFilters,
  trashed,
  onCreate,
}: {
  hasFilters: boolean
  trashed: boolean
  onCreate: () => void
}) {
  if (trashed) {
    return (
      <EmptyState
        icon={Wallet}
        title="A lixeira está vazia"
        description="Contas excluídas aparecem aqui e podem ser restauradas a qualquer momento."
      />
    )
  }

  if (hasFilters) {
    return (
      <EmptyState
        icon={SearchX}
        title="Nenhuma conta encontrada"
        description="Tente ajustar a busca ou os filtros aplicados."
      />
    )
  }

  return (
    <EmptyState
      icon={Wallet}
      tone="primary"
      title="Você ainda não tem contas"
      description="Cadastre sua carteira, contas bancárias ou investimentos para começar a controlar suas finanças."
      action={{ label: "Nova conta", onClick: onCreate }}
    />
  )
}
