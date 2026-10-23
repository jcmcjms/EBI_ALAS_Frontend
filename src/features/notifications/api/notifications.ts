import { apiClient } from '@/src/shared/lib/apiClient'


export interface NotificationResponse {
  id: string
  title: string
  body: string
  type: string
  createdAt: string
  readAt?: string | null
  link?: string | null
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

export async function getNotifications(): Promise<NotificationResponse[]> {
  const { data } = await apiClient.get<InboxPage | NotificationResponse[]>(
    '/api/notifications',
  )
  if (Array.isArray(data)) return data
  return data.items ?? []
}

export async function getNotificationInbox(
  params: InboxQuery = {},
): Promise<InboxPage> {
  const { data } = await apiClient.get<InboxPage>('/api/notifications', {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      type: params.type,
      search: params.search,
    },
  })
  return {
    items: data.items ?? [],
    totalCount: data.totalCount ?? 0,
    unreadCount: data.unreadCount ?? 0,
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
