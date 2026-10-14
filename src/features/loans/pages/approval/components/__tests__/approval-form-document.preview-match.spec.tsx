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
    lai: 'LAM-REVIEW-001',
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

describe('ApprovalFormDocument — matches preview page form', () => {
  it('prefers lamIdByLoanNo for LAM ID like the create-flow preview', () => {
    renderWithQueryClient(
      <ApprovalFormDocument
        data={stubForm}
        lamIdByLoanNo={{ 'P-001': 'LAM-FROM-MAP' }}
      />,
    )
    expect(screen.getByText('LAM-FROM-MAP')).toBeInTheDocument()
    expect(screen.queryByText('LAM-REVIEW-001')).not.toBeInTheDocument()
  })

  it('falls back to the preview placeholder when no LAM ID map is provided', () => {
    renderWithQueryClient(<ApprovalFormDocument data={stubForm} />)
    expect(
      screen.getByText('Generated upon submission'),
    ).toBeInTheDocument()
  })

  it('renders loan purpose from the form parameters like the preview', () => {
    renderWithQueryClient(
      <ApprovalFormDocument
        data={stubForm}
        lamIdByLoanNo={{ 'P-001': 'LAM-FROM-MAP' }}
      />,
    )
    expect(screen.getByText('Loan Purpose:')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })
})
