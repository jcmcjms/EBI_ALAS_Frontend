import { describe, expect, it } from 'vitest'
import { mapFormToReviseCommand } from '@/src/features/loans/model/map-form-to-revise'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

const form = {
  branchType: {
    creationTypeCode: 0,
    creationTypeLabel: 'New Loan',
    branch: 'BR-A',
    requestingOfficer: 'AO',
    lai: 'LAM-1',
  },
  client: {
    cisId: 'CIS-1',
    firstName: 'Juan',
    middleName: '',
    lastName: 'Dela Cruz',
    suffix: '',
    birthdate: '',
    address: '',
    agency: '',
    position: '',
    employeeId: '',
    netTakeHomePay: 0,
    lengthOfService: '',
    region: '',
    divisionCode: '',
    stationCode: '',
    misAgency: '',
    school: '',
    referrer: '',
  },
  loans: [
    {
      loanNo: '1',
      productCode: 'A16',
      productDescription: 'A16 - Salary',
      creationTypeCode: 0,
      creationTypeLabel: 'New Loan',
      branchCode: 'BR-A',
      parameters: {
        product: 'A16 - Salary',
        purpose: 'Emergency',
        proposedAmount: 1500,
        term: 30,
        interestRate: 0.05,
        notarialFee: 10,
        docStamps: 5,
        insurance: 50,
        standardFeesSnapshot: {
          notarialFee: 10,
          docStamps: 5,
          insurance: 50,
        },
      },
      ebiReloans: [],
      buyOuts: [],
      incomingLoans: [],
      verification: { findings: [] },
      deviations: {},
    },
  ],
  outstandingLoans: [],
  preLoan: undefined,
  loanType: 'New',
} as unknown as LoanApplicationFormData

describe('mapFormToReviseCommand', () => {
  it('maps scalar loan fields and required notes without immutable keys', () => {
    const cmd = mapFormToReviseCommand(form, 'Fixed amount per feedback.', 'AQAAAA==')

    expect(cmd.principal).toBe(1500)
    expect(cmd.termDays).toBe(30)
    expect(cmd.interestRatePerMonth).toBe(0.05)
    expect(cmd.revisionNotes).toBe('Fixed amount per feedback.')
    expect(cmd.rowVersion).toBe('AQAAAA==')
    expect(cmd.clientName).toBe('Juan Dela Cruz')
    expect(cmd).not.toHaveProperty('branchId')
    expect(cmd).not.toHaveProperty('productCode')
    expect(cmd).not.toHaveProperty('lamId')
    expect(cmd.form).toBe(form)
  })
})
