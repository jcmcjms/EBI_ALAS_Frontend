import { describe, expect, it } from 'vitest'
import { mapFormToSubmitLoanRequest } from '../map-form-to-request'
import type { LoanApplicationFormData } from '../../schemas/schema'

function makeForm(): LoanApplicationFormData {
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
    loans: [
      {
        loanNo: 'PN-1',
        productCode: 'A16',
        productDescription: 'A16 - Salary',
        creationTypeCode: 0,
        creationTypeLabel: 'New Loan',
        branchCode: '011',
        parameters: {
          product: 'A16 - Salary',
          purpose: 'Education',
          proposedAmount: 10000,
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
        },
      },
    ],
    outstandingLoans: [],
    loanType: 'New',
  } as LoanApplicationFormData
}

describe('mapFormToSubmitLoanRequest', () => {
  it('maps the form to the flat SubmitLoanRequest wire body', () => {
    const body = mapFormToSubmitLoanRequest(makeForm())

    expect(body).toEqual({
      applicationGroupNo: '',
      clientName: 'Ana Cruz',
      branchId: '011',
      loanType: 'New',
      principal: 10000,
      termDays: 30,
      interestRatePerMonth: 1.5,
      serviceFee: 150,
      insuranceFee: 25,
      otherDeductions: 0,
    })
  })
})
