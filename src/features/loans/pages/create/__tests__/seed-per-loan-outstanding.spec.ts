import { describe, expect, it } from 'vitest'
import { seedOutstandingForLoan } from '../components/use-loan-loader'
import type { OutstandingLoan } from '@/src/features/loans/schemas/schema'

const cis: OutstandingLoan[] = [
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
]

describe('seedOutstandingForLoan', () => {
  it('clones rows so loans do not share array references', () => {
    const a = seedOutstandingForLoan(cis)
    const b = seedOutstandingForLoan(cis)
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
    expect(a[0]).not.toBe(b[0])
    expect(a).not.toBe(b)
    a[0].pn = 'CHANGED'
    expect(b[0].pn).toBe('OLD-1')
    expect(cis[0].pn).toBe('OLD-1')
  })
})
