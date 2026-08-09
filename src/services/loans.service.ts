import { loansRepository } from "@/repositories/loans.repository"

export const loansService = {
  /** Sincroniza parcelas vencidas para "atrasado" antes de listar — ver
   * loansRepository.syncOverdue. */
  async list(userId: string) {
    await loansRepository.syncOverdue(userId)
    return loansRepository.list(userId)
  },
  getById: loansRepository.getById,
  create: loansRepository.create,
  update: loansRepository.update,
  remove: loansRepository.remove,
  listInstallments: loansRepository.listInstallments,
  payInstallment: loansRepository.payInstallment,
}
