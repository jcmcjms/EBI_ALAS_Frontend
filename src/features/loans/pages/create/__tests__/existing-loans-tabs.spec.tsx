import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'

import { ObligationsSection } from '../components/obligations-section'
import { ActiveLoanProvider } from '../active-loan-context'
import { LoanTransfersProvider } from '../loan-transfers-provider'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import { createPerLoanSectionDefaults } from '@/src/features/loans/schemas/schema'

vi.mock('@/src/shared/ui/feedback/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

function makeLoan(loanNo: string, productCode: string) {
  return {
    loanNo,
    productCode,
    productDescription: `${productCode} product`,
    creationTypeCode: 0 as const,
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
      standardFeesSnapshot: { notarialFee: 0, docStamps: 0, insurance: 0 },
    },
    ...createPerLoanSectionDefaults(),
    outstandingLoans: [
      {
        pn: 'OLD-1',
        principalBalance: 1000,
        amortization: 100,
        outstandingBalance: 1000,
        dateGranted: '',
        dateMaturity: '',
        status: 'Active',
        productWithDescription: 'OLD - Prior',
      },
    ],
  }
}

function Harness({
  onReady,
}: {
  onReady?: (m: ReturnType<typeof useForm<LoanApplicationFormData>>) => void
}) {
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
      loanType: 'New',
    } as LoanApplicationFormData,
  })
  onReady?.(methods)
  return (
    <FormProvider {...methods}>
      <ActiveLoanProvider loans={methods.getValues('loans')}>
        <LoanTransfersProvider>
          <ObligationsSection />
        </LoanTransfersProvider>
      </ActiveLoanProvider>
    </FormProvider>
  )
}

describe('Existing Loans per application tabs', () => {
  it('transfers only the active application and leaves the other outstanding', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    let methodsRef: ReturnType<typeof useForm<LoanApplicationFormData>> | null =
      null

    render(
      <QueryClientProvider client={queryClient}>
        <Harness
          onReady={(m) => {
            methodsRef = m
          }}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('tab', { name: /A16/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /B17/ })).toBeInTheDocument()

    const trigger = screen.getByRole('button', {
      name: /transfer to ebi reloans/i,
    })
    fireEvent.pointerDown(trigger)
    await user.click(trigger)
    await user.click(
      await screen.findByRole('menuitem', { name: /ebi reloans/i }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const loans = methodsRef!.getValues('loans')
    expect(loans[0].outstandingLoans).toHaveLength(0)
    expect(loans[0].ebiReloans).toHaveLength(1)
    expect(loans[1].outstandingLoans).toHaveLength(1)
    expect(loans[1].ebiReloans).toHaveLength(0)
  })
})
