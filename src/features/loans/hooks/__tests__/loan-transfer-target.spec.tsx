import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useLoanTransfers } from '../use-loan-transfers'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import { createPerLoanSectionDefaults } from '@/src/features/loans/schemas/schema'

function makeLoan(loanNo: string) {
  return {
    loanNo,
    productCode: 'A16',
    productDescription: 'A16 - Salary',
    creationTypeCode: 0 as const,
    creationTypeLabel: 'New Loan',
    branchCode: '001',
    parameters: {
      product: 'A16 - Salary',
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

function baseForm(): LoanApplicationFormData {
  return {
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
    loans: [makeLoan('PN-1'), makeLoan('PN-2')],
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
  } as LoanApplicationFormData
}

function createWrapper(initial: LoanApplicationFormData) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const methods = useForm<LoanApplicationFormData>({ defaultValues: initial })
    return <FormProvider {...methods}>{children}</FormProvider>
  }
}

describe('handleTransfer target loan index', () => {
  it('appends EBI reloan only to the chosen loan application', () => {
    const { result } = renderHook(
      () => {
        const transfers = useLoanTransfers(0)
        const { control } = transfers
        const loans = useWatch({ control, name: 'loans' })
        return { transfers, loans }
      },
      { wrapper: createWrapper(baseForm()) },
    )

    act(() => {
      result.current.transfers.handleTransfer('outstanding', 0, 'ebi', 1)
    })

    expect(result.current.loans[0].ebiReloans).toHaveLength(0)
    expect(result.current.loans[1].ebiReloans).toHaveLength(1)
    expect(result.current.loans[1].ebiReloans[0]).toMatchObject({
      pn: 'OLD-1',
    })
  })

  it('falls back to activeLoanIndex when no target is provided', () => {
    const { result } = renderHook(
      () => {
        const transfers = useLoanTransfers(0)
        const { control } = transfers
        const loans = useWatch({ control, name: 'loans' })
        return { transfers, loans }
      },
      { wrapper: createWrapper(baseForm()) },
    )

    act(() => {
      result.current.transfers.handleTransfer('outstanding', 0, 'ebi')
    })

    expect(result.current.loans[0].ebiReloans).toHaveLength(1)
    expect(result.current.loans[1].ebiReloans).toHaveLength(0)
  })
})
