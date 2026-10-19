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
  }
}

function Harness({
  onReady,
}: {
  onReady?: (methods: ReturnType<typeof useForm<LoanApplicationFormData>>) => void
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

describe('Outstanding → EBI transfer targeting', () => {
  it('asks which loan application should receive the reloan', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    let methodsRef: ReturnType<typeof useForm<LoanApplicationFormData>> | null =
      null

    render(
      <QueryClientProvider client={queryClient}>
        <Harness
          onReady={(methods) => {
            methodsRef = methods
          }}
        />
      </QueryClientProvider>,
    )

    const trigger = screen.getByRole('button', {
      name: /transfer to ebi reloans/i,
    })
    fireEvent.pointerDown(trigger)
    await user.click(trigger)

    const menuItem = await screen.findByRole('menuitem', {
      name: /ebi reloans/i,
    })
    await user.click(menuItem)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/A16 · PN-10001/)).toBeInTheDocument()
    expect(screen.getByText(/B17 · PN-20002/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /B17 · PN-20002/ }))
    await user.click(screen.getByRole('button', { name: /move to ebi reloans/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(methodsRef).not.toBeNull()
    const loans = methodsRef!.getValues('loans')
    expect(loans[0].ebiReloans).toHaveLength(0)
    expect(loans[1].ebiReloans).toHaveLength(1)
    expect(loans[1].ebiReloans[0]).toMatchObject({ pn: 'OLD-1' })
  })
})
