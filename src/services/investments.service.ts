import { investmentsRepository } from "@/repositories/investments.repository"

export const investmentsService = {
  list: investmentsRepository.list,
  getById: investmentsRepository.getById,
  create: investmentsRepository.create,
  update: investmentsRepository.update,
  remove: investmentsRepository.remove,
}
