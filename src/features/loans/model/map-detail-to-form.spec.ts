import { describe, expect, it } from 'vitest'
import { mapLoanDetailToFormData } from './map-detail-to-form'
import type { LoanDetailResponse } from '../api/loan-review'

function legacyDetail(): LoanDetailResponse {
  return {
    id: '901',
    form: null,
    lamId: 'LAM-2026-00914',
    applicationGroupNo: 'GRP-100',
    branchCode: '0142',
    loanNo: 'LN-2026-901',
    productCode: 'SL-01',
    product: 'Salary Loan — Regular',
    creationTypeCode: 1,
    creationTypeLabel: 'New Loan',
    requestingOfficer: 'Branch Head, Malasiqui',
    lai: 'LAI-0142-221',
    cisId: '0041882',
    firstName: 'Nenita',
    middleName: 'Robles',
    lastName: 'Alcantara',
    suffix: null,
    birthdate: '1978-04-11T00:00:00+08:00',
    address: '142 Poblacion Sur',
    agency: 'DepEd',
    position: 'Teacher III',
    employeeId: 'T-88213',
    netTakeHomePay: 24500,
    lengthOfService: '18 years',
    region: 'Region I',
    divisionCode: 'DIV-0142',
    stationCode: 'STN-221',
    misAgency: 'DEPED',
    school: null,
    referrer: null,
    purpose: 'Home renovation',
    proposedAmount: 450000,
    termDays: 730,
    interestRate: 0.14,
    policyTermMonths: 24,
    approvalTermDays: 730,
    annualRatePercent: 14,
    cDocStamp: 150,
    nthpDate: '2026-10-06T00:00:00+08:00',
    status: 'ForRevision',
    hasDeviations: true,
    evaluationVerdict: null,
    createdById: '1042378',
    createdByName: 'Maria Santos',
    createdAt: '2026-10-20T08:00:00+08:00',
    updatedAt: '2026-10-24T08:00:00+08:00',
    lastActionDate: '2026-10-24T08:00:00+08:00',
    lastActionByName: 'Maria Santos',
    lastActionVerb: 'StatusChanged',
  } as unknown as LoanDetailResponse
}

describe('mapLoanDetailToFormData (legacy fallback, no form snapshot)', () => {
  it('normalizes ISO timestamps to date-input values', () => {
    const form = mapLoanDetailToFormData(legacyDetail())
    expect(form.client.birthdate).toBe('1978-04-11')
    expect(form.loans[0].parameters.nthpDate).toBe('2026-10-06')
  })

  it('keeps amounts and rates readable', () => {
    const form = mapLoanDetailToFormData(legacyDetail())
    expect(form.loans[0].parameters.proposedAmount).toBe(450000)
    expect(form.loans[0].parameters.term).toBe(730)
    expect(form.loans[0].parameters.interestRate).toBe(14)
  })

  it('survives details without the optional loan arrays', () => {
    const form = mapLoanDetailToFormData(legacyDetail())
    expect(form.loans[0].ebiReloans).toEqual([])
    expect(form.loans[0].buyOuts).toEqual([])
    expect(form.loans[0].incomingLoans).toEqual([])
    expect(form.loans[0].outstandingLoans).toEqual([])
    expect(form.outstandingLoans).toEqual([])
  })

  it('carries the deviation flag through', () => {
    const form = mapLoanDetailToFormData(legacyDetail())
    expect(form.loans[0].deviations.hasDeviations).toBe(true)
  })
})
