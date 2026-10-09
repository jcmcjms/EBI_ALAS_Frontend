import { create } from 'zustand/react'

export type NotificationType = 'application' | 'action' | 'message' | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  createdAt: string
  read: boolean
  actor?: string
  link?: string
}

export function classifyNotification(title: string): NotificationType {
  const t = title.toLowerCase()
  if (
    t.includes('ready for') ||
    t.includes('recommendation') ||
    t.includes('approval')
  )
    return 'action'
  if (
    t.includes('submitted') ||
    t.includes('application') ||
    t.includes('returned')
  )
    return 'application'
  if (t.includes('status update')) return 'message'
  return 'system'
}

interface NotificationState {
  notifications: AppNotification[]
  setNotifications: (rows: AppNotification[]) => void
  addNotification: (notification: AppNotification) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  setNotifications: (rows) => set({ notifications: rows }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        notification,
        ...state.notifications.filter((n) => n.id !== notification.id),
      ],
    })),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.read ? n : { ...n, read: true },
      ),
    })),
}))
