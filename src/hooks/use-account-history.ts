import { useQuery } from "@tanstack/react-query"
import { accountHistoryRepository } from "@/repositories/account-history.repository"
import { accountsService } from "@/services/accounts.service"
import { auditService } from "@/services/audit.service"

export type AccountHistoryItem =
  | { kind: "transaction"; date: string; data: Awaited<ReturnType<typeof accountHistoryRepository.listTransactions>>[number] }
  | { kind: "transfer"; date: string; data: Awaited<ReturnType<typeof accountHistoryRepository.listTransfers>>[number] }
  | { kind: "reconciliation"; date: string; data: Awaited<ReturnType<typeof accountsService.listReconciliations>>[number] }
  | { kind: "audit"; date: string; data: Awaited<ReturnType<typeof auditService.listForRecord>>[number] }

export function useAccountHistory(accountId: string | null) {
  return useQuery({
    queryKey: ["account-history", accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<AccountHistoryItem[]> => {
      const [transactions, transfers, reconciliations, auditLogs] = await Promise.all([
        accountHistoryRepository.listTransactions(accountId!),
        accountHistoryRepository.listTransfers(accountId!),
        accountsService.listReconciliations(accountId!),
        auditService.listForRecord("accounts", accountId!),
      ])

      const items: AccountHistoryItem[] = [
        ...transactions.map((t): AccountHistoryItem => ({ kind: "transaction", date: t.date, data: t })),
        ...transfers.map((t): AccountHistoryItem => ({ kind: "transfer", date: t.date, data: t })),
        ...reconciliations.map((r): AccountHistoryItem => ({
          kind: "reconciliation",
          date: r.reconciled_at,
          data: r,
        })),
        ...auditLogs.map((a): AccountHistoryItem => ({ kind: "audit", date: a.created_at, data: a })),
      ]

      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
  })
}
