import { accountsRepository } from "@/repositories/accounts.repository"

export const accountsService = {
  list: accountsRepository.list,
  getById: accountsRepository.getById,
  create: accountsRepository.create,
  update: accountsRepository.update,
  softDelete: accountsRepository.softDelete,
  restore: accountsRepository.restore,
  reconcile: accountsRepository.reconcile,
  listReconciliations: accountsRepository.listReconciliations,
  countActiveAccounts: accountsRepository.countActiveAccounts,
}
