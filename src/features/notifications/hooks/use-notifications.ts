import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastError } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { notificationKeys } from '@/src/features/notifications/api/notification-queries'
import {
  getNotifications,
  getNotificationInbox,
  markNotificationRead,
  markAllNotificationsRead,
  type InboxQuery,
} from '../api/notifications'
import { useNotificationStore } from '../store/notification-store'
import { mapApiNotifications } from '../types'

export function useNotifications(enabled = true, isSignalRConnected = false) {
  const setNotifications = useNotificationStore((s) => s.setNotifications)

  const query = useQuery({
    queryKey: notificationKeys.all,
    queryFn: getNotifications,
    refetchInterval: isSignalRConnected ? false : 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    enabled,
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (query.data) {
      setNotifications(mapApiNotifications(query.data))
    }
  }, [query.data, setNotifications])

  return query
}

export function useNotificationInbox(params: InboxQuery, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.inbox(params),
    queryFn: () => getNotificationInbox(params),
    placeholderData: (prev) => prev,
    enabled,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  const markRead = useNotificationStore((s) => s.markRead)

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(Number(id)),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: notificationKeys.all,
      })
      markRead(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      })
    },
    onError: (error) => {
      toastError(getErrorMessage(error))
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  const markAllRead = useNotificationStore((s) => s.markAllRead)

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: notificationKeys.all,
      })
      markAllRead()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      })
    },
    onError: (error) => {
      toastError(getErrorMessage(error))
    },
  })
}
