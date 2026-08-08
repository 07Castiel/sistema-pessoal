import { recurringRulesRepository } from "@/repositories/recurring-rules.repository"

export const recurringRulesService = {
  list: recurringRulesRepository.list,
  listTrashed: recurringRulesRepository.listTrashed,
  create: recurringRulesRepository.create,
  update: recurringRulesRepository.update,
  setActive: recurringRulesRepository.setActive,
  end: recurringRulesRepository.end,
  softDelete: recurringRulesRepository.softDelete,
  restore: recurringRulesRepository.restore,
  generateDue: recurringRulesRepository.generateDue,
  getStats: recurringRulesRepository.getStats,
}
