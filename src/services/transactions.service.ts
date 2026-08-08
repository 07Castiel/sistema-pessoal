import { transactionsRepository } from "@/repositories/transactions.repository"
import { recurringRulesRepository } from "@/repositories/recurring-rules.repository"
import type { TransactionFormValues } from "@/schemas/transaction.schema"

export const transactionsService = {
  list: transactionsRepository.list,
  totals: transactionsRepository.totals,
  getById: transactionsRepository.getById,
  setStatus: transactionsRepository.setStatus,
  softDelete: transactionsRepository.softDelete,
  restore: transactionsRepository.restore,
  softDeleteInstallmentGroup: transactionsRepository.softDeleteInstallmentGroup,
  countTrashed: transactionsRepository.countTrashed,
  update: transactionsRepository.update,

  /**
   * Ponto único de criação: decide entre lançamento simples,
   * parcelamento (RPC atômica) ou regra de recorrência.
   */
  async create(userId: string, values: TransactionFormValues) {
    if (values.repeat === "installments") {
      return transactionsRepository.createInstallments(values)
    }
    if (values.repeat === "recurring") {
      // Cria a regra e já materializa a primeira ocorrência vencida.
      const rule = await recurringRulesRepository.createFromTransactionForm(userId, values)
      await recurringRulesRepository.generateDue()
      return rule
    }
    return transactionsRepository.create(userId, values)
  },
}
