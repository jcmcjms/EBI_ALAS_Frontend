import { describe, expect, it } from 'vitest'
import { formatComparison, pendingApplications } from '../model/metrics'
import type { DashboardSummary } from '../types'

const summary = (over: Partial<DashboardSummary> = {}): DashboardSummary => ({
  totalPending: 0,
  pendingDeltaFromYesterday: 0,
  nowServing: 0,
  pushBacksToday: 0,
  approvedToday: 0,
  approvedVsAvgPercent: 0,
  ...over,
})

describe('formatComparison', () => {
  it('renders neutral text when delta is zero', () => {
    expect(formatComparison('from yesterday', 0)).toBe(
      'No change from yesterday',
    )
  })
  it('omits comparison when delta is null or undefined', () => {
    expect(formatComparison('from yesterday', null)).toBe('')
    expect(formatComparison('from yesterday', undefined)).toBe('')
  })
  it('formats non-zero deltas with sign', () => {
    expect(formatComparison('from yesterday', 2)).toBe('+2 from yesterday')
    expect(formatComparison('from yesterday', -1)).toBe('-1 from yesterday')
  })
})

describe('pendingApplications', () => {
  it('is the sum already stored as totalPending', () => {
    expect(pendingApplications(summary({ totalPending: 9 }))).toBe(9)
  })
})
