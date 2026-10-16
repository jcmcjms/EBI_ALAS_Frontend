import { describe, expect, it } from 'vitest'
import { formatLoanDateTime } from '@/src/shared/lib/format'

describe('formatLoanDateTime', () => {
  it('renders date and time in Asia/Manila regardless of UTC offset', () => {
    
    const formatted = formatLoanDateTime('2026-10-13T01:00:00.000Z')
    expect(formatted).toContain('2026')
    expect(formatted).toContain('Oct')
    expect(formatted).toContain('13')
    expect(formatted).toMatch(/09:00|9:00/)
    expect(formatted).not.toMatch(/01:00|1:00 AM/)
  })
})
