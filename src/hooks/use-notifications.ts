import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { notificationsService } from "@/services/notifications.service"
import { useAuth } from "@/hooks/use-auth"

export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  const listQuery = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => notificationsService.listRecent(userId!),
    enabled: !!userId,
  })

  const unreadQuery = useQuery({
    queryKey: ["notifications", userId, "unread-count"],
    queryFn: () => notificationsService.countUnread(userId!),
    enabled: !!userId,
    refetchInterval: 60_000,
  })

  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] })
    },
  })

  const markAllAsRead = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] })
    },
  })

  return {
    notifications: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    unreadCount: unreadQuery.data ?? 0,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  }
}
