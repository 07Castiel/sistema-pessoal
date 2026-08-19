import { transactionPaymentsRepository } from "@/repositories/transaction-payments.repository"

export const transactionPaymentsService = {
  listByTransaction: transactionPaymentsRepository.listByTransaction,
  create: transactionPaymentsRepository.create,
  update: transactionPaymentsRepository.update,
  remove: transactionPaymentsRepository.remove,
}
