import { costCentersRepository } from "@/repositories/cost-centers.repository"

export const costCentersService = {
  list: costCentersRepository.list,
  create: costCentersRepository.create,
  update: costCentersRepository.update,
  setActive: costCentersRepository.setActive,
  remove: costCentersRepository.remove,
  countUsage: costCentersRepository.countUsage,
  countUsageBatch: costCentersRepository.countUsageBatch,
}
