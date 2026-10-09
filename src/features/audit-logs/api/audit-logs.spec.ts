import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/src/shared/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

const { apiClient } = await import('@/src/shared/lib/apiClient')
const { listAuditLogs } = await import('./audit-logs')

describe('listAuditLogs', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
  })

  it('maps a raw paged DTO without an ApiResponse envelope', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            timestamp: '2026-10-09T12:00:00Z',
            userId: '22222222-2222-2222-2222-222222222222',
            userName: 'admin',
            action: 'Update',
            entityType: 'User',
            entityId: '33333333-3333-3333-3333-333333333333',
            entityLabel: 'jdoe',
            summary: 'Updated user jdoe',
            rawChanges: null,
            ipAddress: null,
            userAgent: null,
          },
        ],
        currentPage: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    })

    const page = await listAuditLogs({ page: 1, pageSize: 20, search: 'jdoe' })

    expect(page.items[0]).toMatchObject({
      userName: 'admin',
      action: 'Update',
      summary: 'Updated user jdoe',
    })
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/audit-logs',
      expect.objectContaining({
        params: expect.objectContaining({ search: 'jdoe', page: 1 }),
      }),
    )
  })
})
