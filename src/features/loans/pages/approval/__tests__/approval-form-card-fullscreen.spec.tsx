import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { ApprovalFormCard } from '../approval-form-card'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

const formData = {
  branchType: {
    creationTypeCode: 0,
    creationTypeLabel: 'New Loan',
    branch: 'BCH01',
    requestingOfficer: 'Officer',
    lai: 'LAM-FS-001',
  },
  client: {
    cisId: 'C-1',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    agency: 'DepEd',
  },
  loans: [],
} as unknown as LoanApplicationFormData

describe('ApprovalFormCard full screen', () => {
  it('enters and exits full screen', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <ApprovalFormCard
          formData={formData}
          loanId="1"
          zoom={1}
          onZoomChange={vi.fn()}
        />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /full screen/i }))
    expect(
      screen.getByRole('button', { name: /close full screen/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close full screen/i }))
    expect(
      screen.getByRole('button', { name: /full screen/i }),
    ).toBeInTheDocument()
  })
})
