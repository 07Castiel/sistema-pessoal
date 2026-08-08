import { tagsRepository } from "@/repositories/tags.repository"

export const tagsService = {
  list: tagsRepository.list,
  create: tagsRepository.create,
  update: tagsRepository.update,
  remove: tagsRepository.remove,
  countUsage: tagsRepository.countUsage,
  countUsageBatch: tagsRepository.countUsageBatch,
}
