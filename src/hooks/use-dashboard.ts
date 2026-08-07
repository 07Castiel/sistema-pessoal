import { useQuery } from "@tanstack/react-query"
import { dashboardService } from "@/services/dashboard.service"
import { useAuth } from "@/hooks/use-auth"

export function useDashboard() {
  const { user } = useAuth()
  const userId = user?.id
  const now = new Date()

  const accounts = useQuery({
    queryKey: ["dashboard", "accounts", userId],
    queryFn: () => dashboardService.getAccounts(userId!),
    enabled: !!userId,
  })

  const netWorth = useQuery({
    queryKey: ["dashboard", "net-worth", userId],
    queryFn: () => dashboardService.getNetWorth(userId!),
    enabled: !!userId,
  })

  const monthlySummaries = useQuery({
    queryKey: ["dashboard", "monthly-summary", userId],
    queryFn: () => dashboardService.getMonthlySummaries(userId!, 6),
    enabled: !!userId,
  })

  const categorySummary = useQuery({
    queryKey: ["dashboard", "category-summary", userId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () =>
      dashboardService.getCategorySummary(userId!, now.getFullYear(), now.getMonth() + 1),
    enabled: !!userId,
  })

  const recentTransactions = useQuery({
    queryKey: ["dashboard", "recent-transactions", userId],
    queryFn: () => dashboardService.getRecentTransactions(userId!, 8),
    enabled: !!userId,
  })

  const upcomingBills = useQuery({
    queryKey: ["dashboard", "upcoming-bills", userId],
    queryFn: () => dashboardService.getUpcomingBills(userId!, 6),
    enabled: !!userId,
  })

  const overdueBills = useQuery({
    queryKey: ["dashboard", "overdue-bills", userId],
    queryFn: () => dashboardService.getOverdueBills(userId!, 6),
    enabled: !!userId,
  })

  const currentMonth = monthlySummaries.data?.at(-1)

  return {
    isLoading:
      accounts.isLoading || netWorth.isLoading || monthlySummaries.isLoading,
    accounts: accounts.data ?? [],
    netWorth: netWorth.data,
    monthlySummaries: monthlySummaries.data ?? [],
    categorySummary: categorySummary.data ?? [],
    recentTransactions: recentTransactions.data ?? [],
    upcomingBills: upcomingBills.data ?? [],
    overdueBills: overdueBills.data ?? [],
    currentMonthIncome: currentMonth?.total_income ?? 0,
    currentMonthExpense: currentMonth?.total_expense ?? 0,
    currentMonthBalance: currentMonth?.balance ?? 0,
  }
}
