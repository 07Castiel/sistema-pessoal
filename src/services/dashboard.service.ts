import { dashboardRepository } from "@/repositories/dashboard.repository"

export const dashboardService = {
  getAccounts: dashboardRepository.getAccounts,
  getNetWorth: dashboardRepository.getNetWorth,
  getMonthlySummaries: dashboardRepository.getMonthlySummaries,
  getCategorySummary: dashboardRepository.getCategorySummary,
  getRecentTransactions: dashboardRepository.getRecentTransactions,
  getUpcomingBills: dashboardRepository.getUpcomingBills,
  getOverdueBills: dashboardRepository.getOverdueBills,
}
