import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/src/shared/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}))

import { apiClient } from '@/src/shared/lib/apiClient'
import {
  getNotifications,
  getNotificationInbox,
  markNotificationRead,
  markAllNotificationsRead,
} from './notifications'
import { mapApiNotification } from '../types'

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getNotifications', () => {
  it('requests GET /api/notifications (not /recent)', async () => {
    mockedGet.mockResolvedValue({ data: { items: [], totalCount: 0, unreadCount: 0 } })

    await getNotifications()

    expect(mockedGet).toHaveBeenCalledWith('/api/notifications')
  })

  it('unwraps envelope items and still accepts a raw array', async () => {
    mockedGet.mockResolvedValue({
      data: {
        items: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            title: 'Loan submitted',
            body: 'Ready for recommendation',
            type: 'Action',
            createdAt: '2026-10-09T01:00:00Z',
            readAt: null,
          },
        ],
        totalCount: 1,
        unreadCount: 1,
      },
    })

    const rows = await getNotifications()

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      title: 'Loan submitted',
      body: 'Ready for recommendation',
      readAt: null,
    })

    mockedGet.mockResolvedValue({
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'Loan submitted',
          body: 'Ready for recommendation',
          type: 'Action',
          createdAt: '2026-10-09T01:00:00Z',
          readAt: null,
        },
      ],
    })

    expect(await getNotifications()).toHaveLength(1)
  })
})

describe('mapApiNotification', () => {
  it('maps backend fields to AppNotification shape', () => {
    const app = mapApiNotification({
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Loan approved',
      body: 'Disbursement pending',
      type: 'System',
      createdAt: '2026-10-09T01:00:00Z',
      readAt: '2026-10-09T02:00:00Z',
    })

    expect(app).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Loan approved',
      description: 'Disbursement pending',
      read: true,
    })
  })
})

describe('markNotificationRead', () => {
  it('posts to /api/notifications/{id}/read with a Guid id', async () => {
    mockedPost.mockResolvedValue({ data: null })

    await markNotificationRead('33333333-3333-3333-3333-333333333333')

    expect(mockedPost).toHaveBeenCalledWith(
      '/api/notifications/33333333-3333-3333-3333-333333333333/read',
    )
  })
})

describe('markAllNotificationsRead', () => {
  it('posts to /api/notifications/read-all and returns changedCount', async () => {
    mockedPost.mockResolvedValue({ data: { changedCount: 3 } })

    const changed = await markAllNotificationsRead()

    expect(mockedPost).toHaveBeenCalledWith('/api/notifications/read-all')
    expect(changed).toBe(3)
  })
})

describe('getNotificationInbox', () => {
  it('passes filters and paging to the API', async () => {
    mockedGet.mockResolvedValue({
      data: {
        items: [
          {
            id: '44444444-4444-4444-4444-444444444444',
            title: 'A',
            body: 'B',
            type: 'Application',
            createdAt: '2026-10-09T01:00:00Z',
            readAt: null,
          },
        ],
        totalCount: 12,
        unreadCount: 4,
      },
    })

    const page = await getNotificationInbox({
      page: 2,
      pageSize: 5,
      status: 'unread',
      type: 'application',
      search: 'loan',
    })

    expect(mockedGet).toHaveBeenCalledWith('/api/notifications', {
      params: {
        page: 2,
        pageSize: 5,
        status: 'unread',
        type: 'application',
        search: 'loan',
      },
    })
    expect(page.totalCount).toBe(12)
    expect(page.unreadCount).toBe(4)
    expect(page.items).toHaveLength(1)
  })

  it('omits status when filter is all', async () => {
    mockedGet.mockResolvedValue({
      data: { items: [], totalCount: 0, unreadCount: 0 },
    })

    await getNotificationInbox({ status: 'all' })

    expect(mockedGet).toHaveBeenCalledWith('/api/notifications', {
      params: {
        page: 1,
        pageSize: 10,
        status: undefined,
        type: undefined,
        search: undefined,
      },
    })
  })
})
