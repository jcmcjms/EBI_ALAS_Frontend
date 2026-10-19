import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useLoanTransfers } from '../use-loan-transfers'
import type {
  LoanApplicationFormData,
  OutstandingLoan,
} from '@/src/features/loans/schemas/schema'
import { createPerLoanSectionDefaults } from '@/src/features/loans/schemas/schema'

function makeLoan(loanNo: string, outstanding: OutstandingLoan[]) {
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
    outstandingLoans: outstanding.map((o) => ({ ...o })),
  }
}

const sampleOb = (): OutstandingLoan => ({
  pn: 'OLD-1',
  principalBalance: 1000,
  amortization: 100,
  outstandingBalance: 1000,
  dateGranted: '',
  dateMaturity: '',
  status: 'Active',
  productWithDescription: 'OLD - Prior',
})

function createWrapper(initial: LoanApplicationFormData) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const methods = useForm<LoanApplicationFormData>({ defaultValues: initial })
    return <FormProvider {...methods}>{children}</FormProvider>
  }
}

function renderTransfers(initial: LoanApplicationFormData) {
  return renderHook(
    () => {
      const transfers = useLoanTransfers(0)
      const loans = useWatch({ control: transfers.control, name: 'loans' })
      return { transfers, loans }
    },
    { wrapper: createWrapper(initial) },
  )
}

const baseForm = (): LoanApplicationFormData =>
  ({
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
    loans: [makeLoan('PN-1', [sampleOb()]), makeLoan('PN-2', [sampleOb()])],
    loanType: 'New',
  }) as LoanApplicationFormData

describe('per-loan outstanding transfer', () => {
  it('moves to EBI only on the chosen application', () => {
    const { result } = renderTransfers(baseForm())

    act(() => {
      result.current.transfers.handleTransfer('outstanding', 0, 'ebi', 0)
    })

    expect(result.current.loans[0].outstandingLoans).toHaveLength(0)
    expect(result.current.loans[0].ebiReloans).toHaveLength(1)
    expect(result.current.loans[1].outstandingLoans).toHaveLength(1)
    expect(result.current.loans[1].ebiReloans).toHaveLength(0)
    expect(result.current.loans[1].outstandingLoans[0].pn).toBe('OLD-1')
  })

  it('independent copies do not share row identity', () => {
    const form = baseForm()
    const { result } = renderTransfers(form)

    act(() => {
      result.current.transfers.handleTransfer('outstanding', 0, 'ebi', 0)
    })

    act(() => {
      result.current.transfers.handleTransfer('outstanding', 0, 'ebi', 1)
    })

    expect(result.current.loans[0].ebiReloans).toHaveLength(1)
    expect(result.current.loans[1].ebiReloans).toHaveLength(1)
  })
})
