import { budgetsRepository } from "@/repositories/budgets.repository"

export const budgetsService = {
  listByPeriod: budgetsRepository.listByPeriod,
  getSpentByCategory: budgetsRepository.getSpentByCategory,
  create: budgetsRepository.create,
  update: budgetsRepository.update,
  remove: budgetsRepository.remove,
}
