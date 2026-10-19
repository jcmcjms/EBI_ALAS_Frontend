import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'

import { CISLookup } from '../components/cis-lookup'
import { ActiveLoanProvider } from '../active-loan-context'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import { createPerLoanSectionDefaults } from '@/src/features/loans/schemas/schema'

function makeLoan(loanNo: string, productCode: string, typeLabel: string) {
  return {
    loanNo,
    productCode,
    productDescription: `${productCode} product`,
    creationTypeCode: 0 as const,
    creationTypeLabel: typeLabel,
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

function Harness() {
  const methods = useForm<LoanApplicationFormData>({
    defaultValues: {
      branchType: {
        creationTypeCode: 0,
        creationTypeLabel: 'New Loan',
        branch: 'Main',
        requestingOfficer: 'Officer One',
        lai: '',
      },
      client: {
        cisId: 'C-1',
        firstName: 'Juan',
        lastName: 'Cruz',
        agency: 'DepEd',
      },
      loans: [
        makeLoan('PN-10001', 'A16', 'New Loan'),
        makeLoan('PN-20002', 'B17', 'Reloan'),
      ],
      loanType: 'New',
    } as LoanApplicationFormData,
  })

  return (
    <FormProvider {...methods}>
      <ActiveLoanProvider loans={methods.getValues('loans')}>
        <CISLookup
          onPreLoanChange={() => {}}
          clientConfirmed
          onConfirmClient={() => {}}
          onClientCleared={() => {}}
        />
      </ActiveLoanProvider>
    </FormProvider>
  )
}

describe('Branch & type per application tabs', () => {
  it('shows a tab per application with that loan’s type', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    )

    expect(screen.getByText('Branch & type')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /A16/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /B17/ })).toBeInTheDocument()
    expect(screen.getByText('New Loan')).toBeInTheDocument()
    expect(screen.getByText('Officer One')).toBeInTheDocument()
  })
})
