import type { NotificationResponse } from './api/notifications'

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

export { formatRelativeTime, initialsOf } from '@/src/shared/lib/format'

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

export function mapApiNotification(n: NotificationResponse): AppNotification {
  return {
    id: String(n.id),
    type: (n.type as NotificationType) ?? classifyNotification(n.title),
    title: n.title,
    description: n.description,
    createdAt: n.createdAt,
    read: n.isRead,
    link: n.link ?? undefined,
  }
}

export function mapApiNotifications(
  rows: NotificationResponse[],
): AppNotification[] {
  return rows.map(mapApiNotification)
}
