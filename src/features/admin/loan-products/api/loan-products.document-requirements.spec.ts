import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/src/shared/lib/apiClient', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}))

const { apiClient } = await import('@/src/shared/lib/apiClient')
const {
  getLoanProductDocumentRequirements,
  replaceLoanProductDocumentRequirements,
} = await import('./loan-products')

describe('document requirements client', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.put).mockReset()
  })

  it('gets requirements as a bare array', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ code: 'A1004', description: 'A1004' }],
    })
    await expect(getLoanProductDocumentRequirements('A16')).resolves.toEqual([
      { code: 'A1004', description: 'A1004' },
    ])
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/loan-products/A16/document-requirements',
    )
  })

  it('puts the full item list', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: [{ code: 'PIC02', description: 'Photo ID' }],
    })
    const result = await replaceLoanProductDocumentRequirements('A16', [
      { code: 'PIC02', description: 'Photo ID' },
    ])
    expect(result).toEqual([{ code: 'PIC02', description: 'Photo ID' }])
    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/loan-products/A16/document-requirements',
      { items: [{ code: 'PIC02', description: 'Photo ID' }] },
    )
  })
})
