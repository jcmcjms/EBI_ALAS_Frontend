import type { NotificationResponse } from './api/notifications'
import {
  classifyNotification,
  type AppNotification,
  type NotificationType,
} from '@/src/shared/store/notification-store'

export { formatRelativeTime, initialsOf } from '@/src/shared/lib/format'
export {
  classifyNotification,
  type AppNotification,
  type NotificationType,
} from '@/src/shared/store/notification-store'

export function mapApiNotification(n: NotificationResponse): AppNotification {
  return {
    id: n.id,
    type: (n.type.toLowerCase() as NotificationType) ?? classifyNotification(n.title),
    title: n.title,
    description: n.body,
    createdAt: n.createdAt,
    read: Boolean(n.readAt),
  }
}

export function mapApiNotifications(
  rows: NotificationResponse[],
): AppNotification[] {
  return rows.map(mapApiNotification)
}
