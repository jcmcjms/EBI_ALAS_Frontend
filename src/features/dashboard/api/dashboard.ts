import { apiClient } from '@/src/shared/lib/apiClient'
import type { DashboardData, LoanStatus } from '../types'

export interface DashboardOverviewResponse {
  pendingRecommendation: number
  pendingEvaluation: number
  pendingApproval: number
  approvedToday: number
  pushbacks: number
  nowServingCount?: number
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
  pendingQueue?: {
    position: number
    lamId: string
    branchId: string
    status: string
    statusKey: string
    date: string
    clientName: string
    encoderName: string
  }[]
  nowServing?: {
    number: number
    checker: string
    lamId: string
    isActive: boolean
  }[]
  pushBackItems?: {
    number: number
    lamId: string
    branchId: string
    date: string
    reason: string
  }[]
  approvedLoans?: {
    branchId: string
    lamId: string
    date: string
    fullName: string
  }[]
  weeklyTrend?: {
    day: string
    approved: number
    pushBacks: number
  }[]
}

function toStatus(value: string): LoanStatus {
  return value as LoanStatus
}

export function mapDashboardOverview(
  o: DashboardOverviewResponse,
): DashboardData {
  const pendingQueue = o.pendingQueue ?? []
  const nowServing = o.nowServing ?? []
  return {
    summary: {
      totalPending:
        o.pendingRecommendation + o.pendingEvaluation + o.pendingApproval,
      pendingDeltaFromYesterday: 0,
      nowServing: o.nowServingCount ?? nowServing.length,
      pushBacksToday: o.pushbacks,
      approvedToday: o.approvedToday,
      approvedVsAvgPercent: 0,
    },
    pendingQueue: pendingQueue.map((p) => ({
      position: p.position,
      lamId: p.lamId,
      branch: p.branchId,
      status: toStatus(p.status),
      statusKey: p.statusKey,
      date: p.date,
      clientName: p.clientName,
      encoderName: p.encoderName,
    })),
    nowServing: nowServing.map((s) => ({
      number: s.number,
      checker: s.checker,
      lamId: s.lamId,
      isActive: s.isActive,
    })),
    pushBacks: (o.pushBackItems ?? []).map((p) => ({
      number: p.number,
      lamId: p.lamId,
      branch: p.branchId,
      date: p.date,
      reason: p.reason,
    })),
    approvedLoans: (o.approvedLoans ?? []).map((a) => ({
      branch: a.branchId,
      lamId: a.lamId,
      date: a.date,
      fullName: a.fullName,
    })),
    weeklyTrend: (o.weeklyTrend ?? []).map((w) => ({
      day: w.day,
      approved: w.approved,
      pushBacks: w.pushBacks,
    })),
    incompleteDocsQueue: (o.flaggedDocuments ?? []).map((f, index) => ({
      id: f.id,
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

export function manilaTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function dashboardOverviewUrl(date?: string): string {
  const day = date ?? manilaTodayIso()
  return `/api/dashboard/overview?date=${encodeURIComponent(day)}`
}

export async function getDashboardOverview(
  date?: string,
): Promise<DashboardData> {
  const res = await apiClient.get<DashboardOverviewResponse>(
    dashboardOverviewUrl(date),
  )
  return mapDashboardOverview(res.data)
}
