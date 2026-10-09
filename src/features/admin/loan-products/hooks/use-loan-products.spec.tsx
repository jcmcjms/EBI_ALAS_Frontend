import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

vi.mock('../api/loan-products', () => ({
  getLoanProducts: vi.fn(),
  getLoanProductByCode: vi.fn(),
  importLoanProducts: vi.fn(),
  syncLoanProducts: vi.fn(),
  updateLoanProduct: vi.fn(),
  exportLoanProducts: vi.fn(),
  downloadLoanProductTemplate: vi.fn(),
  findProductByCode: vi.fn(),
}))

const api = await import('../api/loan-products')
const { useImportLoanProducts, useLoanProducts, useSyncLoanProducts } =
  await import('./use-loan-products')

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return { client, Wrapper }
}

describe('loan product cache refresh', () => {
  beforeEach(() => {
    vi.mocked(api.getLoanProducts).mockReset()
    vi.mocked(api.importLoanProducts).mockReset()
    vi.mocked(api.syncLoanProducts).mockReset()
    vi.mocked(api.getLoanProducts).mockResolvedValue([])
    vi.mocked(api.importLoanProducts).mockResolvedValue({
      totalRows: 1,
      created: 1,
      updated: 0,
      failed: 0,
      errors: [],
    })
    vi.mocked(api.syncLoanProducts).mockResolvedValue({
      added: 1,
      updated: 0,
      preserved: 0,
      syncedAt: '2026-10-09T00:00:00Z',
    })
  })

  it('refetches the product list after a successful import', async () => {
    const { Wrapper } = createWrapper()
    const list = renderHook(() => useLoanProducts(), { wrapper: Wrapper })
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true))
    expect(api.getLoanProducts).toHaveBeenCalledTimes(1)

    const importHook = renderHook(() => useImportLoanProducts(), {
      wrapper: Wrapper,
    })
    importHook.result.current.mutate(new File(['x'], 'products.xlsx'))

    await waitFor(() => expect(importHook.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(api.getLoanProducts).toHaveBeenCalledTimes(2))
  })

  it('refetches the product list after a successful sync', async () => {
    const { Wrapper } = createWrapper()
    const list = renderHook(() => useLoanProducts(), { wrapper: Wrapper })
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true))
    expect(api.getLoanProducts).toHaveBeenCalledTimes(1)

    const syncHook = renderHook(() => useSyncLoanProducts(), {
      wrapper: Wrapper,
    })
    syncHook.result.current.mutate()

    await waitFor(() => expect(syncHook.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(api.getLoanProducts).toHaveBeenCalledTimes(2))
  })
})
