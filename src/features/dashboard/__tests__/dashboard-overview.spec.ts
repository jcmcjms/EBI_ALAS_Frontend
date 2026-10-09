import { describe, expect, it } from 'vitest'
import { mapDashboardOverview, type DashboardOverviewResponse } from '../api/dashboard'

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
})
