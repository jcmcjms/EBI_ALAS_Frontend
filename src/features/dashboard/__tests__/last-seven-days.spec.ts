import { describe, expect, it } from 'vitest'
import {
  shouldShowWeeklyChart,
  summarizeWeeklyTrend,
} from '../model/last-seven-days'

describe('shouldShowWeeklyChart', () => {
  it('hides chart for empty or mostly-zero series', () => {
    expect(shouldShowWeeklyChart([])).toBe(false)
    expect(
      shouldShowWeeklyChart([
        { day: 'Mon', approved: 0, pushBacks: 0 },
        { day: 'Tue', approved: 1, pushBacks: 0 },
      ]),
    ).toBe(false)
  })
  it('shows chart when at least two days have activity', () => {
    expect(
      shouldShowWeeklyChart([
        { day: 'Mon', approved: 1, pushBacks: 0 },
        { day: 'Tue', approved: 0, pushBacks: 2 },
      ]),
    ).toBe(true)
  })
})

describe('summarizeWeeklyTrend', () => {
  it('totals approved and returned (pushBacks)', () => {
    expect(
      summarizeWeeklyTrend([
        { day: 'Mon', approved: 1, pushBacks: 2 },
        { day: 'Tue', approved: 3, pushBacks: 0 },
      ]),
    ).toEqual({ approved: 4, returned: 2 })
  })
})
