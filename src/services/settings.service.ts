import { settingsRepository } from "@/repositories/settings.repository"

export const settingsService = {
  updateProfile: settingsRepository.updateProfile,
  updateFinancialGoals: settingsRepository.updateFinancialGoals,
}
