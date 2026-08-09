import { creditCardsRepository } from "@/repositories/credit-cards.repository"

export const creditCardsService = {
  list: creditCardsRepository.list,
  getById: creditCardsRepository.getById,
  usage: creditCardsRepository.usage,
  create: creditCardsRepository.create,
  update: creditCardsRepository.update,
  setStatus: creditCardsRepository.setStatus,
  remove: creditCardsRepository.remove,
  countInvoices: creditCardsRepository.countInvoices,
}
