import { describe, expect, it } from 'vitest'
import { mapFormToSubmissionPayload } from '../map-form-to-request'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import { createPerLoanSectionDefaults } from '@/src/features/loans/schemas/schema'

describe('mapFormToSubmissionPayload per-loan outstanding', () => {
  it('maps each loan’s own outstanding list', () => {
    const form = {
      branchType: {
        creationTypeCode: 0,
        creationTypeLabel: 'New',
        branch: 'B',
        requestingOfficer: 'O',
      },
      client: { cisId: 'C', firstName: 'A', lastName: 'B', agency: 'X' },
      loans: [
        {
          loanNo: 'PN-1',
          productCode: 'A16',
          productDescription: 'A',
          creationTypeCode: 0,
          creationTypeLabel: 'New',
          branchCode: 'B',
          parameters: {
            product: 'A',
            purpose: 'p',
            proposedAmount: 1,
            term: 1,
            notarialFee: 0,
            docStamps: 0,
            insurance: 0,
          },
          ...createPerLoanSectionDefaults(),
          outstandingLoans: [
            {
              pn: 'OLD-1',
              principalBalance: 1,
              amortization: 1,
              outstandingBalance: 1,
              dateGranted: '',
              dateMaturity: '',
              status: 'Active',
              productWithDescription: 'X',
            },
          ],
        },
        {
          loanNo: 'PN-2',
          productCode: 'B17',
          productDescription: 'B',
          creationTypeCode: 0,
          creationTypeLabel: 'New',
          branchCode: 'B',
          parameters: {
            product: 'B',
            purpose: 'p',
            proposedAmount: 1,
            term: 1,
            notarialFee: 0,
            docStamps: 0,
            insurance: 0,
          },
          ...createPerLoanSectionDefaults(),
          outstandingLoans: [],
        },
      ],
      loanType: 'New',
    } as unknown as LoanApplicationFormData

    const payload = mapFormToSubmissionPayload(form)
    expect(payload.loans[0].outstandingLoans).toHaveLength(1)
    expect(payload.loans[1].outstandingLoans).toHaveLength(0)
  })
})
