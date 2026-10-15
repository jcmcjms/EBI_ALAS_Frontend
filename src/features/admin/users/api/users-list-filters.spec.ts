import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/src/shared/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

const { apiClient } = await import('@/src/shared/lib/apiClient')
const { listUsers } = await import('@/src/features/admin/users/api/users')

describe('listUsers', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], totalCount: 0, page: 1, pageSize: 20 },
    })
  })

  it('sends search, role, and branchId query params when provided', async () => {
    await listUsers({
      search: 'ada',
      role: 'Encoder',
      branchId: '011',
      pageNumber: 2,
      pageSize: 10,
    })

    expect(apiClient.get).toHaveBeenCalledWith('/api/users', {
      params: {
        page: 2,
        pageSize: 10,
        search: 'ada',
        role: 'Encoder',
        branchId: '011',
      },
    })
  })

  it('omits empty search and undefined filters', async () => {
    await listUsers({ search: '   ', pageNumber: 1, pageSize: 20 })

    expect(apiClient.get).toHaveBeenCalledWith('/api/users', {
      params: {
        page: 1,
        pageSize: 20,
      },
    })
  })
})
