import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

vi.mock('../api/loan-products', () => ({
  getLoanProducts: vi.fn(),
  importLoanProducts: vi.fn(),
  downloadLoanProductTemplate: vi.fn(),
}))

vi.mock('@/src/shared/ui/feedback/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

const api = await import('../api/loan-products')
const { ImportProductsSheet } = await import('./import-products-sheet')
const { useLoanProducts } = await import('../hooks/use-loan-products')

function Harness() {
  const list = useLoanProducts()
  return (
    <>
      <div data-testid="list-status">
        {list.isFetching ? 'fetching' : list.isSuccess ? 'ready' : 'idle'}
      </div>
      <ImportProductsSheet open onClose={() => {}} />
    </>
  )
}

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('ImportProductsSheet', () => {
  beforeEach(() => {
    vi.mocked(api.getLoanProducts).mockReset().mockResolvedValue([])
    vi.mocked(api.importLoanProducts).mockReset().mockResolvedValue({
      totalRows: 1,
      created: 1,
      updated: 0,
      failed: 0,
      errors: [],
    })
  })

  it('reloads the product table after a successful import', async () => {
    renderWithClient(<Harness />)

    await waitFor(() =>
      expect(screen.getByTestId('list-status').textContent).toBe('ready'),
    )
    expect(api.getLoanProducts).toHaveBeenCalledTimes(1)

    const input = document.querySelector('input[type="file"]')
    expect(input).not.toBeNull()
    const file = new File(['x'], 'products.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(input!, { target: { files: [file] } })

    const importButton = screen.getByRole('button', { name: /import/i })
    fireEvent.click(importButton)

    await waitFor(() => expect(api.importLoanProducts).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(api.getLoanProducts).toHaveBeenCalledTimes(2))
  })
})
