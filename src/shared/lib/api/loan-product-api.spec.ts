import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/src/shared/lib/apiClient', () => ({
  apiClient: { get: vi.fn() },
}))

const { apiClient } = await import('@/src/shared/lib/apiClient')
const { getLoanProducts } = await import('./loan-product-api')

function page(items: Array<{ code: string }>, totalCount: number, page: number) {
  return {
    data: { items, totalCount, page, pageSize: 100, totalPages: Math.ceil(totalCount / 100) },
  }
}

describe('getLoanProducts', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
  })

  it('loads every page so the full catalog is returned', async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({ code: `P${i}` }))
    const second = Array.from({ length: 23 }, (_, i) => ({ code: `Q${i}` }))
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce(page(first, 123, 1))
      .mockResolvedValueOnce(page(second, 123, 2))

    const products = await getLoanProducts()

    expect(products).toHaveLength(123)
    expect(apiClient.get).toHaveBeenCalledTimes(2)
    expect(vi.mocked(apiClient.get).mock.calls[0][1]).toMatchObject({
      params: { page: 1, pageSize: 100 },
    })
    expect(vi.mocked(apiClient.get).mock.calls[1][1]).toMatchObject({
      params: { page: 2, pageSize: 100 },
    })
  })

  it('returns a raw array when the API is unpaged', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [{ code: 'A16' }, { code: 'C02' }],
    })

    await expect(getLoanProducts()).resolves.toEqual([{ code: 'A16' }, { code: 'C02' }])
  })
})
