import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LoanProductResponse } from '@/src/shared/lib/api/types'

vi.mock('@/src/shared/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const { apiClient } = await import('@/src/shared/lib/apiClient')
const { getLoanProducts, importLoanProducts, syncLoanProducts } = await import(
  '@/src/features/admin/loan-products/api/loan-products'
)

const rawBackendItem = {
  code: 'A16',
  description: 'Salary Loan',
  minAmount: 10000,
  maxAmount: 250000,
  minTermDays: 30,
  maxTermDays: 365,
  notarialFee: 500,
  docStampFee: 200,
  insuranceFee: 350,
  advanceInterestRate: 0.12,
  applicationChargeRate: 0.06,
  amortizationMode: 'DIM',
  chargeAdvanceInterest: true,
  isRetired: false,
  lastSyncedAt: '2026-10-09T00:00:00Z',
}

describe('getLoanProducts', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
  })

  it('returns products from a raw JSON array response without an ApiResponse envelope', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [rawBackendItem] })

    const products = await getLoanProducts()

    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      code: 'A16',
      description: 'Salary Loan',
      minAmount: 10000,
      maxAmount: 250000,
      isRetired: false,
    } satisfies Partial<LoanProductResponse>)
    expect(apiClient.get).toHaveBeenCalledWith('/api/loan-products')
  })

  it('does not throw when the payload is an empty array', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

    await expect(getLoanProducts()).resolves.toEqual([])
  })
})

describe('syncLoanProducts', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
  })

  it('returns the raw sync result payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        added: 2,
        updated: 1,
        preserved: 3,
        syncedAt: '2026-10-09T12:00:00Z',
      },
    })

    const result = await syncLoanProducts()

    expect(result).toEqual({
      added: 2,
      updated: 1,
      preserved: 3,
      syncedAt: '2026-10-09T12:00:00Z',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/loan-products/sync')
  })
})

describe('importLoanProducts', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
  })

  it('returns the raw import result payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        totalRows: 2,
        created: 1,
        updated: 0,
        failed: 1,
        errors: [{ rowNumber: 3, field: 'Code', error: 'Code is required.' }],
      },
    })

    const file = new File(['x'], 'products.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const result = await importLoanProducts(file)

    expect(result.totalRows).toBe(2)
    expect(result.created).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors[0]).toEqual({
      rowNumber: 3,
      field: 'Code',
      error: 'Code is required.',
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/loan-products/import',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  })
})
