import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FormProvider, useForm } from 'react-hook-form'
import '@testing-library/jest-dom/vitest'

import { LoanFormSections } from '../loan-form-sections'
import type {
  LoanApplicationFormData,
  SelectedLoan,
} from '@/src/features/loans/schemas/schema'
import { createPerLoanSectionDefaults } from '@/src/features/loans/schemas/schema'

vi.mock('../components/cis-lookup', () => ({ CISLookup: () => null }))
vi.mock('../components/personal-info-section', () => ({
  PersonalInfoSection: () => null,
}))
vi.mock('../components/loan-parameters-tabs-section', () => ({
  LoanParametersTabsSection: () => null,
}))
vi.mock('../components/obligations-section', () => ({
  ObligationsSection: () => null,
}))
vi.mock('../components/other-obligations', () => ({
  OtherObligationsSection: () => null,
}))
vi.mock('../components/verification-section', () => ({
  VerificationSection: () => null,
}))
vi.mock('../components/deviations-section', () => ({
  DeviationsSection: () => null,
}))
vi.mock('../components/single-loan-approval-form', () => ({
  SingleLoanApprovalForm: ({ loan }: { loan: { loanNo: string } }) => (
    <div data-testid={`approval-doc-${loan.loanNo}`}>{loan.loanNo}</div>
  ),
}))
vi.mock('@/src/features/loans/api/signatures', () => ({
  useSignatureChain: () => ({ data: [] }),
  withDraftEncoder: (chain: unknown) => chain,
}))

function makeLoan(loanNo: string, productCode: string): SelectedLoan {
  return {
    loanNo,
    productCode,
    productDescription: `${productCode} product`,
    creationTypeCode: 0,
    creationTypeLabel: 'New Loan',
    branchCode: '001',
    parameters: {
      product: productCode,
      purpose: 'Salary',
      proposedAmount: 10000,
      term: 12,
      notarialFee: 0,
      docStamps: 0,
      insurance: 0,
      standardFeesSnapshot: {
        notarialFee: 0,
        docStamps: 0,
        insurance: 0,
      },
    },
    ...createPerLoanSectionDefaults(),
  }
}

function Harness() {
  const methods = useForm<LoanApplicationFormData>({
    defaultValues: {
      branchType: {
        creationTypeCode: 0,
        creationTypeLabel: 'New Loan',
        branch: '001',
        requestingOfficer: 'Officer',
        lai: '',
      },
      client: {
        cisId: 'C-1',
        firstName: 'Juan',
        lastName: 'Cruz',
        agency: 'DepEd',
      },
      loans: [makeLoan('PN-10001', 'A16'), makeLoan('PN-20002', 'B17')],
      outstandingLoans: [],
      loanType: 'New',
    },
  })

  return (
    <FormProvider {...methods}>
      <LoanFormSections
        isClientLoaded
        isSubmitting={false}
        branchTypeCode={0}
        methods={methods}
        registerSectionRef={() => {}}
        approvalFormRef={{ current: null }}
        onPreLoanChange={() => {}}
        clientConfirmed
        onConfirmClient={() => {}}
        onClientCleared={() => {}}
      />
    </FormProvider>
  )
}

describe('Review & Submit approval form tabs', () => {
  it('lets users switch between loan tabs', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    )

    const firstTab = screen.getByRole('tab', { name: /A16/ })
    const secondTab = screen.getByRole('tab', { name: /B17/ })

    expect(firstTab).toBeEnabled()
    expect(secondTab).toBeEnabled()
    expect(firstTab).toHaveAttribute('aria-selected', 'true')

    await user.click(secondTab)

    expect(secondTab).toHaveAttribute('aria-selected', 'true')
    expect(firstTab).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByTestId('approval-doc-PN-20002').parentElement).not.toHaveClass(
      'hidden',
    )
    expect(screen.getByTestId('approval-doc-PN-10001').parentElement).toHaveClass(
      'hidden',
    )
  })
})
