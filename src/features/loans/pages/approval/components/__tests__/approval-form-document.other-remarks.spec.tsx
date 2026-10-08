import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { ApprovalFormDocument } from '../approval-form-document'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

const stubForm = {
  branchType: {
    creationTypeCode: 0,
    creationTypeLabel: 'New Loan',
    branch: 'BCH01',
    requestingOfficer: 'Officer',
    lai: 'LAM-001',
  },
  client: {
    cisId: 'C-1',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    agency: 'DepEd',
  },
  loans: [
    {
      loanNo: 'P-001',
      productCode: 'C21',
      productDescription: 'C21 - Salary Loan',
      creationTypeCode: 0,
      creationTypeLabel: 'New Loan',
      branchCode: 'BCH01',
      parameters: {
        product: 'C21 - Salary Loan',
        purpose: 'Personal',
        proposedAmount: 50_000,
        term: 2520,
        interestRate: 0.0966,
        notarialFee: 500,
        docStamps: 0,
        insurance: 0,
        standardFeesSnapshot: { notarialFee: 500, docStamps: 0, insurance: 0 },
      },
      verification: { findings: 'Verified' },
      deviations: {
        hasDeviations: false,
        deviationDetails: [],
        deviationJustifications: {},
        otherRemarks: '<p>First paragraph</p><p>Second paragraph</p>',
      },
    },
  ],
  outstandingLoans: [],
} as unknown as LoanApplicationFormData

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  )
}

describe('ApprovalFormDocument — other remarks paragraphs', () => {
  it('renders otherRemarks as paragraph elements', () => {
    renderWithQueryClient(<ApprovalFormDocument data={stubForm} />)
    const first = screen.getByText('First paragraph')
    const second = screen.getByText('Second paragraph')
    expect(first.tagName).toBe('P')
    expect(second.tagName).toBe('P')
    expect(first.parentElement).toBe(second.parentElement)
  })
})
