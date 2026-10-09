import { apiClient } from '@/src/shared/lib/apiClient'
import type { DashboardData } from '../types'

/** Raw DTO returned by GET /api/dashboard/overview (no ApiResponse envelope). */
export interface DashboardOverviewResponse {
  pendingRecommendation: number
  pendingEvaluation: number
  pendingApproval: number
  approvedToday: number
  pushbacks: number
}

export function mapDashboardOverview(
  o: DashboardOverviewResponse,
): DashboardData {
  return {
    summary: {
      totalPending:
        o.pendingRecommendation + o.pendingEvaluation + o.pendingApproval,
      pendingDeltaFromYesterday: 0,
      nowServing: 0,
      pushBacksToday: o.pushbacks,
      approvedToday: o.approvedToday,
      approvedVsAvgPercent: 0,
    },
    pendingQueue: [],
    nowServing: [],
    pushBacks: [],
    approvedLoans: [],
    weeklyTrend: [],
    incompleteDocsQueue: [],
    fetchedAt: new Date().toISOString(),
  }
}

export async function getDashboardOverview(): Promise<DashboardData> {
  const res = await apiClient.get<DashboardOverviewResponse>(
    '/api/dashboard/overview',
  )
  return mapDashboardOverview(res.data)
}
