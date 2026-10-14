import { apiClient } from '@/src/shared/lib/apiClient'
import type { DashboardData } from '../types'

/** Raw DTO returned by GET /api/dashboard/overview (no ApiResponse envelope). */
export interface DashboardOverviewResponse {
  pendingRecommendation: number
  pendingEvaluation: number
  pendingApproval: number
  approvedToday: number
  pushbacks: number
  flaggedDocuments?: {
    id: string
    lamId: string
    branchId: string
    waitingSinceUtc: string
    missingCount: number
    clientName: string
    encoderName: string
    flaggedByName: string | null
    flaggedAt: string | null
  }[]
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
    incompleteDocsQueue: (o.flaggedDocuments ?? []).map((f, index) => ({
      id: index + 1,
      position: index + 1,
      lamId: f.lamId,
      branch: f.branchId,
      waitingSinceUtc: f.waitingSinceUtc,
      missingCount: f.missingCount,
      clientName: f.clientName,
      encoderName: f.encoderName,
      flaggedByName: f.flaggedByName ?? undefined,
      flaggedAt: f.flaggedAt ?? undefined,
    })),
    fetchedAt: new Date().toISOString(),
  }
}

export async function getDashboardOverview(): Promise<DashboardData> {
  const res = await apiClient.get<DashboardOverviewResponse>(
    '/api/dashboard/overview',
  )
  return mapDashboardOverview(res.data)
}
