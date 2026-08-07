import { notificationsRepository } from "@/repositories/notifications.repository"

export const notificationsService = {
  listRecent: notificationsRepository.listRecent,
  countUnread: notificationsRepository.countUnread,
  markAsRead: notificationsRepository.markAsRead,
  markAllAsRead: notificationsRepository.markAllAsRead,
}
