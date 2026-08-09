import { goalContributionsRepository } from "@/repositories/goal-contributions.repository"

export const goalContributionsService = {
  listByGoal: goalContributionsRepository.listByGoal,
  create: goalContributionsRepository.create,
  remove: goalContributionsRepository.remove,
}
