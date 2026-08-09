import { goalsRepository } from "@/repositories/goals.repository"

export const goalsService = {
  list: goalsRepository.list,
  getById: goalsRepository.getById,
  create: goalsRepository.create,
  update: goalsRepository.update,
  setStatus: goalsRepository.setStatus,
  remove: goalsRepository.remove,
}
