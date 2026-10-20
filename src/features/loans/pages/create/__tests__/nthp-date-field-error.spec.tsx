import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import '@testing-library/jest-dom/vitest'

import { LoanParametersFields } from '../components/loan-parameters-fields'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import { createPerLoanSectionDefaults } from '@/src/features/loans/schemas/schema'

function Harness({ nthpDate }: { nthpDate?: string }) {
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
        {
          loanNo: 'PN-10001',
          productCode: 'A16',
          productDescription: 'A16 product',
          creationTypeCode: 0 as const,
          creationTypeLabel: 'New Loan',
          branchCode: '001',
          parameters: {
            product: 'A16',
            purpose: 'Salary',
            proposedAmount: 10000,
            term: 12,
            nthpDate,
            notarialFee: 0,
            docStamps: 0,
            insurance: 0,
            standardFeesSnapshot: { notarialFee: 0, docStamps: 0, insurance: 0 },
          },
          ...createPerLoanSectionDefaults(),
        },
      ],
      loanType: 'New',
    } as LoanApplicationFormData,
  })

  useEffect(() => {
    methods.setError('loans.0.parameters.nthpDate', {
      type: 'custom',
      message: 'Add the payslip date before continuing.',
    })
  }, [methods])

  return (
    <FormProvider {...methods}>
      <LoanParametersFields fieldPrefix="loans.0.parameters" loanIndex={0} />
    </FormProvider>
  )
}

describe('NTHP Date field error', () => {
  it('shows a recovery message when the payslip date is missing', async () => {
    render(<Harness nthpDate="" />)
    expect(
      await screen.findByText('Add the payslip date before continuing.'),
    ).toBeInTheDocument()
  })
})
