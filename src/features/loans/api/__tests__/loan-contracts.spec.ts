import { describe, expect, it } from 'vitest'

import {
  toSubmitLoanApplicationsRequest,
  type SubmitLoanLine,
} from '../loan-submit'
import { mapPageResult, type BackendPageResult } from '@/src/shared/lib/api/types'

const line: SubmitLoanLine = {
  productCode: 'A16',
  product: 'A16 - Salary',
  principal: 10000,
  termDays: 30,
  interestRatePerMonth: 2,
  serviceFee: 100,
  insuranceFee: 50,
  otherDeductions: 0,
}

describe('toSubmitLoanApplicationsRequest', () => {
  it('maps form loanType Renewal to wire Reloan and keeps all loans', () => {
    const body = toSubmitLoanApplicationsRequest({
      applicationGroupNo: '',
      clientName: 'Ben Santos',
      branchId: '011',
      loanType: 'Renewal',
      loans: [line, { ...line, productCode: 'C02', product: 'C02 - Payday' }],
    })

    expect(body.loanType).toBe('Reloan')
    expect(body.loans).toHaveLength(2)
    expect(body.loans[1].productCode).toBe('C02')
  })

  it('emits exactly the SubmitLoanApplicationsRequest keys', () => {
    const body = toSubmitLoanApplicationsRequest({
      applicationGroupNo: 'G4',
      clientName: 'Dan Lopez',
      branchId: '012',
      loanType: 'New',
      loans: [line],
    })

    expect(Object.keys(body).sort()).toEqual(
      [
        'applicationGroupNo',
        'branchId',
        'clientName',
        'form',
        'loanType',
        'loans',
      ].sort(),
    )
  })
})

describe('mapPageResult for loans list', () => {
  it('derives UI paging fields from the bare backend PageResult', () => {
    const wire: BackendPageResult<{ id: string }> = {
      items: [{ id: '1' }],
      totalCount: 12,
      page: 2,
      pageSize: 1,
      totalPages: 12,
    }

    const paged = mapPageResult(wire)

    expect(paged.currentPage).toBe(2)
    expect(paged.totalCount).toBe(12)
    expect(paged.hasPreviousPage).toBe(true)
    expect(paged.hasNextPage).toBe(true)
    expect(paged.items).toHaveLength(1)
  })
})
