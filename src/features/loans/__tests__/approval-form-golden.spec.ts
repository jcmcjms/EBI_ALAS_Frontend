import { describe, expect, it } from 'vitest'
import type { LoanDetailResponse } from '../api/loan-review'
import { mapLoanDetailToFormData } from '../utils/map-detail-to-form'
import { computeLoanMetrics } from '../utils/loan-approval-utils'

function goldenDetail(): LoanDetailResponse {
  return {
    id: 1,
    lamId: 'LAM-20260929-000001',
    applicationGroupNo: 'GRP-001',
    branchCode: '001',
    loanNo: 'PN-10001',
    productCode: 'A16',
    product: 'A16 - APDS',
    creationTypeCode: 1,
    creationTypeLabel: 'Reloan',
    requestingOfficer: 'Juan Dela Cruz',
    lai: 'LAI-1',
    cisId: 'CIS-555',
    firstName: 'Maria',
    middleName: null,
    lastName: 'Reyes',
    suffix: null,
    birthdate: null,
    address: null,
    agency: 'DepEd',
    position: null,
    employeeId: null,
    netTakeHomePay: 15000,
    lengthOfService: null,
    region: null,
    divisionCode: null,
    stationCode: null,
    misAgency: null,
    school: null,
    referrer: null,
    purpose: 'Salary',
    proposedAmount: 322000,
    termDays: 1856,
    interestRate: 7.5,
    policyTermMonths: 60,
    approvalTermDays: 1800,
    annualRatePercent: 7.5,
    cDocStamp: 3000,
    nthpDate: null,
    notarialFee: 500,
    docStamps: 2415,
    insurance: 0,
    standardNotarialFee: 500,
    standardDocStamps: 2415,
    standardInsurance: 0,
    verificationFindings: null,
    hasDeviations: true,
    deviationDetails: ['Lacking CIBI'],
    deviationJustifications: {},
    remarks: null,
    aoRecommendation: null,
    otherRemarks: null,
    feeDeviationJustification: null,
    status: 'ForChecking',
    applicationDate: '2026-09-29',
    lastActionDate: '2026-09-29',
    createdById: 7,
    createdByName: 'Encoder One',
    actions: [],
    evaluationVerdict: null,
    documentFlag: null,
    outstandingLoans: [],
    buyOuts: [],
    ebiReloans: [
      {
        id: 21,
        pn: 'PN-80001',
        name: 'Previous EBI Loan',
        existingDeduction: 6471.6,
        outstandingBalance: 229850.44,
        payToClose: 229850.44,
      },
    ],
    incomingLoans: [],
    preLoanId: null,
    preLoanFormNumber: null,
    webLoanPnNumbers: ['PN-80001'],
    documentsComplete: null,
    documentsCompleteAt: null,
    assignedApproverName: null,
    requiredApprovalTier: null,
    assignedApproverId: null,
  }
}

describe('approval form golden figures (LAM-20260929-000001)', () => {
  it('mapLoanDetailToFormData + computeLoanMetrics print the locked document figures', () => {
    const form = mapLoanDetailToFormData(goldenDetail())
    const c = computeLoanMetrics(form.loans[0], {
      outstandingLoans: form.outstandingLoans,
      ebiReloans: form.loans[0].ebiReloans,
      buyOuts: form.loans[0].buyOuts,
      incomingLoans: form.loans[0].incomingLoans,
      client: form.client,
    })

    expect(c.approvalTermDays).toBe(1800)

    expect(c.docStamp).toBe(3000)
    expect(c.applicationCharge).toBeCloseTo(15820, 2)

    expect(c.deductionsSubtotal).toBeCloseTo(19320, 2)
    expect(c.deductionPct).toBeCloseTo(6, 2)

    expect(c.grossProceeds).toBeCloseTo(302680, 2)

    expect(c.ebiOb).toBeCloseTo(229850.44, 2)

    expect(form.loans[0].deviations.deviationDetails).not.toHaveLength(0)
  })
})
