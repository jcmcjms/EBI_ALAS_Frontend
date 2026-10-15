import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { ApprovalFormDocument } from '../approval-form-document'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import type { TimelineEvent } from '@/src/features/loans/api/loan-review'

vi.mock('@/src/features/loans/api/loan-review-documents', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/src/features/loans/api/loan-review-documents')>()
  return {
    ...actual,
    getLoanTimeline: vi.fn(),
  }
})

import { getLoanTimeline } from '@/src/features/loans/api/loan-review-documents'

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
        otherRemarks: 'None',
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

function event(partial: Partial<TimelineEvent> & { id: string }): TimelineEvent {
  return {
    type: 'workflow',
    occurredAtUtc: '2026-09-28T09:30:00Z',
    actorName: 'Pedro Recommender',
    actorRole: 'Recommender',
    action: 'Recommended',
    fromStatus: 'ForRecommendation',
    toStatus: 'ForChecking',
    comment: null,
    subject: null,
    subjectCode: null,
    ...partial,
  }
}

describe('ApprovalFormDocument — application history (print)', () => {
  it('does not render history when timeline is empty', async () => {
    vi.mocked(getLoanTimeline).mockResolvedValue({
      items: [],
      currentPage: 1,
      pageSize: 50,
      totalCount: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    })

    renderWithQueryClient(
      <ApprovalFormDocument data={stubForm} loanId="loan-1" />,
    )

    await waitFor(() => {
      expect(getLoanTimeline).toHaveBeenCalled()
    })
    expect(screen.queryByText('APPLICATION HISTORY')).not.toBeInTheDocument()
  })

  it('renders monitoring-style history with actor and remarks', async () => {
    vi.mocked(getLoanTimeline).mockResolvedValue({
      items: [
        event({
          id: '1',
          actorName: 'Maria Encoder',
          action: 'Created',
          fromStatus: null,
          toStatus: 'ForRecommendation',
        }),
        event({
          id: '2',
          action: 'Recommended',
          comment: 'Docs complete, recommend for evaluation.',
        }),
        event({
          id: '3',
          type: 'documentRemark',
          action: 'DocumentRemarkAdded',
          actorName: 'Ana Cruz',
          subject: 'PAYSIP',
          comment: 'Please clarify this payslip',
          fromStatus: null,
          toStatus: null,
        }),
      ],
      currentPage: 1,
      pageSize: 50,
      totalCount: 3,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    })

    renderWithQueryClient(
      <ApprovalFormDocument data={stubForm} loanId="loan-1" />,
    )

    await screen.findByText('APPLICATION HISTORY & REMARKS')
    expect(screen.getByText('Maria Encoder')).toBeInTheDocument()
    expect(screen.getByText('Pedro Recommender')).toBeInTheDocument()
    expect(screen.getByText(/Created the loan application/)).toBeInTheDocument()
    expect(screen.getByText(/Recommended — sent for credit checking/)).toBeInTheDocument()
    expect(
      screen.getByText('Docs complete, recommend for evaluation.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Left a note on a requirement/)).toBeInTheDocument()
    expect(screen.getByText('Please clarify this payslip')).toBeInTheDocument()
  })
})
