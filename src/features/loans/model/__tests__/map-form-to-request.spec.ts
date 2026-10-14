import { describe, expect, it } from 'vitest'
import { mapFormToSubmitLoanRequest } from '../map-form-to-request'
import type { LoanApplicationFormData } from '../../schemas/schema'

function makeForm(loanCount = 1): LoanApplicationFormData {
  const loans = Array.from({ length: loanCount }, (_, i) => ({
    loanNo: `PN-${i + 1}`,
    productCode: i === 0 ? 'A16' : 'C02',
    productDescription: i === 0 ? 'A16 - Salary' : 'C02 - Payday',
    creationTypeCode: 0 as const,
    creationTypeLabel: 'New Loan',
    branchCode: '011',
    parameters: {
      product: i === 0 ? 'A16 - Salary' : 'C02 - Payday',
      purpose: 'Education',
      proposedAmount: 10000 + i * 1000,
      interestRate: 1.5,
      term: 30,
      notarialFee: 100,
      docStamps: 50,
      insurance: 25,
      standardFeesSnapshot: {
        notarialFee: 100,
        docStamps: 50,
        insurance: 25,
      },
    },
    ebiReloans: [],
    buyOuts: [],
    incomingLoans: [],
    verification: { findings: [] },
    deviations: {
      hasDeviations: false,
      deviationDetails: [],
      deviationJustifications: {},
      otherRemarks: '',
    },
  }))

  return {
    branchType: {
      creationTypeCode: 0,
      creationTypeLabel: 'New Loan',
      branch: '011',
      requestingOfficer: 'Officer',
      lai: '011-001',
    },
    client: {
      cisId: 'C1',
      firstName: 'Ana',
      lastName: 'Cruz',
      agency: 'DepEd',
    },
    loans,
    outstandingLoans: [],
    loanType: 'New',
  } as unknown as LoanApplicationFormData
}

describe('mapFormToSubmitLoanRequest', () => {
  it('maps one selected loan to a one-line submission', () => {
    const body = mapFormToSubmitLoanRequest(makeForm(1))

    expect(body.applicationGroupNo).toBe('')
    expect(body.clientName).toBe('Ana Cruz')
    expect(body.branchId).toBe('011')
    expect(body.loanType).toBe('New')
    expect(body.loans).toHaveLength(1)
    expect(body.loans[0]).toEqual({
      productCode: 'A16',
      product: 'A16 - Salary',
      principal: 10000,
      termDays: 30,
      interestRatePerMonth: 1.5,
      serviceFee: 150,
      insuranceFee: 25,
      otherDeductions: 0,
    })
  })

  it('maps multiple selected loans into one application group', () => {
    const body = mapFormToSubmitLoanRequest(makeForm(2))

    expect(body.loans).toHaveLength(2)
    expect(body.loans[0].productCode).toBe('A16')
    expect(body.loans[1].productCode).toBe('C02')
    expect(body.loans[1].principal).toBe(11000)
  })

  it('includes the full create-form snapshot so review can render the preview values', () => {
    const form = makeForm(1)
    const body = mapFormToSubmitLoanRequest(form)

    expect(body.form).toBe(form)
  })
})
