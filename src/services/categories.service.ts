import { categoriesRepository } from "@/repositories/categories.repository"

export const categoriesService = {
  list: categoriesRepository.list,
  create: categoriesRepository.create,
  update: categoriesRepository.update,
  softDelete: categoriesRepository.softDelete,
  restore: categoriesRepository.restore,
  reorder: categoriesRepository.reorder,
  countUsage: categoriesRepository.countUsage,
  countActiveChildren: categoriesRepository.countActiveChildren,
}
