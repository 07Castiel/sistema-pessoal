import { reportsRepository } from "@/repositories/reports.repository"

export const reportsService = {
  getMonthlySummaries: reportsRepository.getMonthlySummaries,
  getCategorySummary: reportsRepository.getCategorySummary,
  getCashFlow: reportsRepository.getCashFlow,
  getNetWorth: reportsRepository.getNetWorth,
}
