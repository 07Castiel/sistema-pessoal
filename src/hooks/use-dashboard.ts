import { useQuery } from "@tanstack/react-query"
import { dashboardService } from "@/services/dashboard.service"
import { useAuth } from "@/hooks/use-auth"

export interface DashboardPeriod {
  year: number
  month: number
}

export function currentPeriod(): DashboardPeriod {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function useDashboard(period: DashboardPeriod = currentPeriod()) {
  const { user } = useAuth()
  const userId = user?.id

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

  const expenseByCategory = useQuery({
    queryKey: ["dashboard", "category-summary", "despesa", userId, period.year, period.month],
    queryFn: () =>
      dashboardService.getCategorySummary(userId!, period.year, period.month, "despesa"),
    enabled: !!userId,
  })

  const incomeByCategory = useQuery({
    queryKey: ["dashboard", "category-summary", "receita", userId, period.year, period.month],
    queryFn: () =>
      dashboardService.getCategorySummary(userId!, period.year, period.month, "receita"),
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

  const pendingSummary = useQuery({
    queryKey: ["dashboard", "pending-summary", userId],
    queryFn: () => dashboardService.getPendingSummary(userId!),
    enabled: !!userId,
  })

  // A view de 6 meses (`v_monthly_summary`) sempre reflete até o mês atual do
  // banco; para o período selecionado usamos a soma direta das categorias,
  // que é exata para qualquer mês navegado (passado ou presente).
  const periodIncome = incomeByCategory.data?.reduce((sum, c) => sum + Number(c.total_amount), 0) ?? 0
  const periodExpense = expenseByCategory.data?.reduce((sum, c) => sum + Number(c.total_amount), 0) ?? 0

  return {
    isLoading:
      accounts.isLoading || netWorth.isLoading || monthlySummaries.isLoading,
    accounts: accounts.data ?? [],
    netWorth: netWorth.data,
    monthlySummaries: monthlySummaries.data ?? [],
    expenseByCategory: expenseByCategory.data ?? [],
    incomeByCategory: incomeByCategory.data ?? [],
    recentTransactions: recentTransactions.data ?? [],
    upcomingBills: upcomingBills.data ?? [],
    overdueBills: overdueBills.data ?? [],
    pendingSummary: pendingSummary.data ?? {
      payable: 0,
      receivable: 0,
      overdueExpense: 0,
      pendingIncome: 0,
    },
    periodIncome,
    periodExpense,
    periodBalance: periodIncome - periodExpense,
  }
}
