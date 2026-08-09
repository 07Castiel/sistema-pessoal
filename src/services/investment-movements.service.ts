import { investmentMovementsRepository } from "@/repositories/investment-movements.repository"

export const investmentMovementsService = {
  listByInvestment: investmentMovementsRepository.listByInvestment,
  create: investmentMovementsRepository.create,
  update: investmentMovementsRepository.update,
  remove: investmentMovementsRepository.remove,
}
