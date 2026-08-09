import { financingsRepository } from "@/repositories/financings.repository"

export const financingsService = {
  async list(userId: string) {
    await financingsRepository.syncOverdue(userId)
    return financingsRepository.list(userId)
  },
  getById: financingsRepository.getById,
  create: financingsRepository.create,
  update: financingsRepository.update,
  remove: financingsRepository.remove,
  listInstallments: financingsRepository.listInstallments,
  payInstallment: financingsRepository.payInstallment,
}
