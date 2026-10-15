import { describe, expect, it } from 'vitest'
import { buildActionRequired } from '../model/action-required'
import type { DashboardData } from '../types'

function emptyData(over: Partial<DashboardData> = {}): DashboardData {
  return {
    summary: {
      totalPending: 0,
      pendingDeltaFromYesterday: 0,
      nowServing: 0,
      pushBacksToday: 0,
      approvedToday: 0,
      approvedVsAvgPercent: 0,
    },
    pendingQueue: [],
    nowServing: [],
    pushBacks: [],
    approvedLoans: [],
    weeklyTrend: [],
    incompleteDocsQueue: [],
    fetchedAt: new Date().toISOString(),
    ...over,
  }
}

describe('buildActionRequired', () => {
  it('returns empty array when nothing needs attention', () => {
    expect(buildActionRequired(emptyData(), 'Encoder')).toEqual([])
  })

  it('includes returned applications and flagged documents', () => {
    const items = buildActionRequired(
      emptyData({
        pushBacks: [
          {
            number: 1,
            lamId: 'LAM-1',
            branch: '001',
            date: '2026-10-15T01:00:00Z',
            reason: 'Fix income docs',
          },
        ],
        incompleteDocsQueue: [
          {
            id: 1,
            position: 1,
            lamId: 'LAM-2',
            branch: '001',
            waitingSinceUtc: '2026-10-15T02:00:00Z',
            missingCount: 2,
            clientName: 'C',
            encoderName: 'E',
          },
        ],
      }),
      'Evaluator',
    )
    expect(items.map((i) => i.kind)).toEqual([
      'Returned',
      'FlaggedDocuments',
    ])
    expect(items[0]?.lamId).toBe('LAM-1')
    expect(items[0]?.reason).toBe('Fix income docs')
  })

  it('adds AwaitingMyAction for role queue statuses', () => {
    const items = buildActionRequired(
      emptyData({
        pendingQueue: [
          {
            position: 1,
            lamId: 'LAM-9',
            branch: '001',
            status: 'For Checking',
            statusKey: 'ForChecking',
            date: '2026-10-15T03:00:00Z',
            clientName: 'C',
            encoderName: 'E',
          },
        ],
      }),
      'Evaluator',
    )
    expect(
      items.some((i) => i.kind === 'AwaitingMyAction' && i.lamId === 'LAM-9'),
    ).toBe(true)
  })
})
