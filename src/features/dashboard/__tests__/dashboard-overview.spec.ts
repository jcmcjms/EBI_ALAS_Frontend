import { describe, expect, it } from 'vitest'
import {
  mapDashboardOverview,
  type DashboardOverviewResponse,
} from '../api/dashboard'

describe('mapDashboardOverview', () => {
  it('maps the raw backend overview counts into dashboard summary', () => {
    const raw: DashboardOverviewResponse = {
      pendingRecommendation: 2,
      pendingEvaluation: 3,
      pendingApproval: 4,
      approvedToday: 5,
      pushbacks: 1,
    }

    const data = mapDashboardOverview(raw)

    expect(data.summary.totalPending).toBe(9)
    expect(data.summary.approvedToday).toBe(5)
    expect(data.summary.pushBacksToday).toBe(1)
    expect(data.pendingQueue).toEqual([])
    expect(data.nowServing).toEqual([])
    expect(data.pushBacks).toEqual([])
    expect(data.approvedLoans).toEqual([])
    expect(data.weeklyTrend).toEqual([])
    expect(data.incompleteDocsQueue).toEqual([])
    expect(data.fetchedAt).toBeTruthy()
  })

  it('maps queue, serving, pushbacks, approved, and weekly trend', () => {
    const data = mapDashboardOverview({
      pendingRecommendation: 1,
      pendingEvaluation: 0,
      pendingApproval: 0,
      approvedToday: 1,
      pushbacks: 1,
      nowServingCount: 1,
      pendingQueue: [
        {
          position: 1,
          lamId: 'LAM-1',
          branchId: '001',
          status: 'ForChecking',
          statusKey: 'ForChecking',
          date: '2026-10-14T01:00:00Z',
          clientName: 'Client',
          encoderName: 'Enc',
        },
      ],
      nowServing: [
        { number: 1, checker: 'Eval', lamId: 'LAM-1', isActive: true },
      ],
      pushBacks: [
        {
          number: 1,
          lamId: 'LAM-2',
          branchId: '001',
          date: '2026-10-13T01:00:00Z',
          reason: 'Returned to Enc',
        },
      ],
      approvedLoans: [
        {
          branchId: '001',
          lamId: 'LAM-3',
          date: '2026-10-12T01:00:00Z',
          fullName: 'Client A',
        },
      ],
      weeklyTrend: [{ day: 'Mon', approved: 1, pushBacks: 1 }],
    })

    expect(data.summary.nowServing).toBe(1)
    expect(data.pendingQueue).toHaveLength(1)
    expect(data.nowServing[0]?.checker).toBe('Eval')
    expect(data.pushBacks[0]?.lamId).toBe('LAM-2')
    expect(data.approvedLoans[0]?.fullName).toBe('Client A')
    expect(data.weeklyTrend[0]).toEqual({
      day: 'Mon',
      approved: 1,
      pushBacks: 1,
    })
  })
})
