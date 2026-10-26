import { describe, expect, it } from 'vitest'
import { loanApplicationSchema } from '@/src/features/loans/schemas/schema'
import { deviationJustificationFieldPath } from './deviation-justification-path'

const DOTTED_REASON = 'Lacking marriage cert. with surname as single'

function baseLoanForm(justifications: Record<string, unknown>) {
  return {
    branchType: {
      creationTypeCode: 1 as const,
      creationTypeLabel: 'Reloan',
      branch: 'Lianga Branch',
      requestingOfficer: 'FELIX M. ORTIZ JR',
      lai: '000-05-01658-9',
    },
    client: {
      cisId: '0880530879',
      firstName: 'LENNIE',
      lastName: 'GATCHALIAN',
      agency: 'RPSU',
    },
    loans: [
      {
        loanNo: 'CL20261035738',
        productCode: 'A17',
        productDescription: 'A17 - APDS-EMP 1-7YR_Dim',
        creationTypeCode: 1 as const,
        creationTypeLabel: 'Reloan',
        branchCode: '000',
        parameters: {
          product: 'A17 - APDS-EMP 1-7YR_Dim',
          purpose: 'PERSONAL PURPOSE - OTHERS',
          proposedAmount: 350000,
          term: 2588,
          nthpDate: '2026-09-30',
        },
        ebiReloans: [],
        buyOuts: [],
        incomingLoans: [],
        outstandingLoans: [],
        verification: { findings: '<p>ok</p>' },
        deviations: {
          hasDeviations: true,
          deviationDetails: [DOTTED_REASON],
          deviationJustifications: justifications,
          otherRemarks: '<p>none</p>',
        },
      },
    ],
    outstandingLoans: [],
    loanType: 'New' as const,
  }
}

describe('deviation justification paths with dotted labels', () => {
  it('rejects nested objects produced by unquoted RHF paths', () => {
    // Simulates register('...deviationJustifications.Lacking marriage cert. with surname as single')
    // which RHF splits into nested objects.
    const broken = baseLoanForm({
      'Lacking marriage cert': { ' with surname as single': 'strong co-maker' },
    })
    const result = loanApplicationSchema.safeParse(broken)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('string'))).toBe(
        true,
      )
    }
  })

  it('accepts flat string justifications keyed by the full reason', () => {
    const fixed = baseLoanForm({
      [DOTTED_REASON]: 'strong co-maker',
    })
    const result = loanApplicationSchema.safeParse(fixed)
    expect(result.success).toBe(true)
  })

  it('builds bracket-quoted field paths so dots stay literal', () => {
    const path = deviationJustificationFieldPath('loans.0.deviations', DOTTED_REASON)
    expect(path).toBe(
      `loans.0.deviations.deviationJustifications[${JSON.stringify(DOTTED_REASON)}]`,
    )
    expect(path).toContain('["Lacking marriage cert. with surname as single"]')
  })
})
