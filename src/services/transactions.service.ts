import { transactionsRepository } from "@/repositories/transactions.repository"
import { recurringRulesRepository } from "@/repositories/recurring-rules.repository"
import { transactionPaymentsRepository } from "@/repositories/transaction-payments.repository"
import type { TransactionFormValues } from "@/schemas/transaction.schema"

/** Registra um pagamento do valor cheio, na data do lançamento, com a
 * forma de pagamento escolhida no form — mesma fonte de verdade
 * (transaction_payments) de qualquer liquidação, total ou parcial. */
function registerFullPayment(userId: string, transactionId: string, values: TransactionFormValues) {
  return transactionPaymentsRepository.create(userId, transactionId, {
    amount: values.amount,
    date: values.date,
    payment_method: values.payment_method,
    notes: null,
  })
}

export const transactionsService = {
  list: transactionsRepository.list,
  totals: transactionsRepository.totals,
  getById: transactionsRepository.getById,
  setStatus: transactionsRepository.setStatus,
  softDelete: transactionsRepository.softDelete,
  restore: transactionsRepository.restore,
  softDeleteInstallmentGroup: transactionsRepository.softDeleteInstallmentGroup,
  countTrashed: transactionsRepository.countTrashed,

  /**
   * Ponto único de criação: decide entre lançamento simples,
   * parcelamento (RPC atômica) ou regra de recorrência. Lançamento único
   * marcado como "já liquidado" nasce pendente (a trigger do banco cuida
   * disso) e recebe, na sequência, um pagamento do valor cheio. Parcelamento
   * e recorrência sempre nascem pendentes (bloqueado no schema), sem esse
   * passo extra.
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

    const transaction = await transactionsRepository.create(userId, values)
    if (values.settled) {
      await registerFullPayment(userId, transaction.id, values)
    }
    return transaction
  },

  /**
   * `previouslyPaidAmount` vem de quem chama (o form já tem o lançamento
   * carregado) — só registra um pagamento cheio quando a transação estava
   * em `paid_amount = 0` e o usuário ligou "já paga/recebida" nesta edição.
   * Fora desse caso (edição de um lançamento já com pagamentos, campo
   * desabilitado no form), `values.settled` é ignorado de propósito, para
   * nunca duplicar um pagamento a cada edição salva.
   */
  async update(
    id: string,
    userId: string,
    values: TransactionFormValues,
    previouslyPaidAmount: number
  ) {
    const transaction = await transactionsRepository.update(id, userId, values)
    if (values.settled && previouslyPaidAmount <= 0) {
      await registerFullPayment(userId, id, values)
    }
    return transaction
  },
}
