import { describe, expect, it } from 'vitest'

import {
  toSubmitLoanRequest,
  type SubmitLoanRequest,
} from '../loan-submit'
import { mapPageResult, type BackendPageResult } from '@/src/shared/lib/api/types'

describe('toSubmitLoanRequest', () => {
  it('produces backend SubmitLoanRequest fields only', () => {
    const body = toSubmitLoanRequest({
      applicationGroupNo: 'G1',
      clientName: 'Ana Cruz',
      branchId: '001',
      productCode: 'A16',
      product: 'A16 - Salary',
      loanType: 'New',
      principal: 10000,
      termDays: 30,
      interestRatePerMonth: 2,
      serviceFee: 100,
      insuranceFee: 50,
      otherDeductions: 0,
      // extras ignored
      client: { cisId: 'X' },
    })

    expect(body).toEqual({
      applicationGroupNo: 'G1',
      clientName: 'Ana Cruz',
      branchId: '001',
      productCode: 'A16',
      product: 'A16 - Salary',
      loanType: 'New',
      principal: 10000,
      termDays: 30,
      interestRatePerMonth: 2,
      serviceFee: 100,
      insuranceFee: 50,
      otherDeductions: 0,
    })
  })

  it('maps the form loanType alias Renewal to the wire value Reloan', () => {
    const body = toSubmitLoanRequest({
      applicationGroupNo: 'G2',
      clientName: 'Ben Santos',
      branchId: '011',
      productCode: 'A16',
      product: 'A16 - Salary',
      loanType: 'Renewal',
      principal: 5000,
      termDays: 15,
      interestRatePerMonth: 1.5,
      serviceFee: 25,
      insuranceFee: 10,
      otherDeductions: 5,
    })

    expect(body.loanType).toBe('Reloan')
  })

  it('keeps a wire loanType of Reloan as Reloan', () => {
    const body = toSubmitLoanRequest({
      applicationGroupNo: 'G3',
      clientName: 'Cora Reyes',
      branchId: '006',
      productCode: 'A16',
      product: 'A16 - Salary',
      loanType: 'Reloan',
      principal: 1,
      termDays: 1,
      interestRatePerMonth: 0,
      serviceFee: 0,
      insuranceFee: 0,
      otherDeductions: 0,
    })

    expect(body.loanType).toBe('Reloan')
  })

  it('emits exactly the SubmitLoanRequest keys', () => {
    const body = toSubmitLoanRequest({
      applicationGroupNo: 'G4',
      clientName: 'Dan Lopez',
      branchId: '012',
      productCode: 'A16',
      product: 'A16 - Salary',
      loanType: 'New',
      principal: 2500,
      termDays: 60,
      interestRatePerMonth: 3,
      serviceFee: 40,
      insuranceFee: 20,
      otherDeductions: 10,
      loans: [{ parameters: { proposedAmount: 999 } }],
      outstandingLoans: [],
    })

    expect(Object.keys(body).sort()).toEqual(
      [
        'applicationGroupNo',
        'branchId',
        'clientName',
        'insuranceFee',
        'interestRatePerMonth',
        'loanType',
        'otherDeductions',
        'principal',
        'product',
        'productCode',
        'serviceFee',
        'termDays',
      ].sort(),
    )
  })
})

describe('mapPageResult for loans list', () => {
  it('derives UI paging fields from the bare backend PageResult', () => {
    const wire: BackendPageResult<SubmitLoanRequest> = {
      items: [
        {
          applicationGroupNo: 'G1',
          clientName: 'Ana Cruz',
          branchId: '001',
          productCode: 'A16',
          product: 'A16 - Salary',
          loanType: 'New',
          principal: 10000,
          termDays: 30,
          interestRatePerMonth: 2,
          serviceFee: 100,
          insuranceFee: 50,
          otherDeductions: 0,
        },
      ],
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
