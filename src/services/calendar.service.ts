import { calendarRepository } from "@/repositories/calendar.repository"

export const calendarService = {
  getTransactionsByDueDate: calendarRepository.getTransactionsByDueDate,
  getCardInvoicesByDueDate: calendarRepository.getCardInvoicesByDueDate,
  getLoanInstallmentsByDueDate: calendarRepository.getLoanInstallmentsByDueDate,
  getFinancingInstallmentsByDueDate: calendarRepository.getFinancingInstallmentsByDueDate,
  getGoalsByTargetDate: calendarRepository.getGoalsByTargetDate,
  getUpcomingRecurringRules: calendarRepository.getUpcomingRecurringRules,
}
