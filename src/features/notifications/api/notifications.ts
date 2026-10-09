import { apiClient } from '@/src/shared/lib/apiClient'

/**
 * Raw DTO returned by GET /api/notifications (no ApiResponse envelope).
 * Field names match Ebi.Alas.Api.Features.Notifications.NotificationResponse.
 */
export interface NotificationResponse {
  id: string
  title: string
  body: string
  type: string
  createdAt: string
  readAt?: string | null
}

export interface InboxQuery {
  page?: number
  pageSize?: number
  status?: 'all' | 'unread' | 'read'
  type?: string
  search?: string
}

export interface InboxPage {
  items: NotificationResponse[]
  totalCount: number
  unreadCount: number
}

function isInboxQueryMatch(row: NotificationResponse, params: InboxQuery): boolean {
  if (params.status === 'unread' && row.readAt) return false
  if (params.status === 'read' && !row.readAt) return false
  if (params.type && row.type !== params.type) return false
  if (params.search) {
    const q = params.search.toLowerCase()
    if (!row.title.toLowerCase().includes(q) && !row.body.toLowerCase().includes(q)) {
      return false
    }
  }
  return true
}

export async function getNotifications(): Promise<NotificationResponse[]> {
  const { data } = await apiClient.get<NotificationResponse[]>('/api/notifications')
  return Array.isArray(data) ? data : []
}

export async function getNotificationInbox(
  params: InboxQuery = {},
): Promise<InboxPage> {
  const rows = await getNotifications()
  const filtered = rows.filter((row) => isInboxQueryMatch(row, params))
  return {
    items: filtered,
    totalCount: filtered.length,
    unreadCount: filtered.filter((row) => !row.readAt).length,
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/api/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await apiClient.post<{ changedCount: number }>(
    '/api/notifications/read-all',
  )
  return data.changedCount
}
