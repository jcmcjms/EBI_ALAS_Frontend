import type {
  DeskQueueResponse,
  QueuedClientDto,
  QueuedLoanDto,
} from '../hooks/use-desk-queue'
import { assessAging, type AgingAssessment } from './loan-aging'
import type { LoanStatus } from './loan-status'

const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

export function formatPhp(amount: number): string {
  return Number.isFinite(amount) ? phpFormatter.format(amount) : '—'
}

export function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
}

export interface ClientBundleSummary {
  applicationCount: number
  totalAmount: number
  oldestEnqueuedAt: string
  worstAging: AgingAssessment
  hasDeviations: boolean
  branchCode: string
}

const TIER_RANK: Record<AgingAssessment['tier'], number> = {
  none: 0,
  ok: 1,
  warning: 2,
  breach: 3,
}

/** Aggregates one client's bundle for desk display: totals, oldest wait, worst aging. */
export function summarizeClient(
  client: QueuedClientDto,
  now: number = Date.now(),
  slaPolicy?: Record<string, number> | null,
): ClientBundleSummary {
  let totalAmount = 0
  let oldestEnqueuedAt = client.enqueuedAt
  let hasDeviations = false
  let worstAging: AgingAssessment = {
    tier: 'none',
    slaHours: null,
    pctOfSla: null,
    label: 'No deadline set',
  }

  for (const app of client.applications) {
    totalAmount += Number.isFinite(app.proposedAmount) ? app.proposedAmount : 0
    if (minutesSince(app.enqueuedAt, now) > minutesSince(oldestEnqueuedAt, now)) {
      oldestEnqueuedAt = app.enqueuedAt
    }
    if (app.hasDeviations) hasDeviations = true
    const assessment = assessAging(
      app.status as LoanStatus,
      app.enqueuedAt,
      now,
      slaPolicy,
    )
    if (TIER_RANK[assessment.tier] > TIER_RANK[worstAging.tier]) {
      worstAging = assessment
    }
  }

  return {
    applicationCount: client.applications.length,
    totalAmount,
    oldestEnqueuedAt,
    worstAging,
    hasDeviations,
    branchCode: client.applications[0]?.branchCode ?? '',
  }
}

export function resolveQueueState(
  desk: DeskQueueResponse | undefined,
  loanId: string,
  userId: string | undefined,
): {
  isHead: boolean
  ownerUserId: string | null
  ownerName?: string
  isMine: boolean
  position?: number
  groupNo?: string
  applicationCount?: number
} | undefined {
  const matches = (client: QueuedClientDto | undefined) =>
    client?.applications.some((a: QueuedLoanDto) => a.loanId === loanId)
      ? client
      : undefined

  let client = matches(desk?.currentClaim ?? undefined)
  for (const item of desk?.items ?? []) {
    if (client) break
    client = matches(item)
  }
  if (!client) return undefined

  return {
    isHead: client.isHead,
    ownerUserId: client.ownerUserId,
    ownerName: client.ownerName ?? undefined,
    isMine:
      client.ownerUserId != null &&
      userId != null &&
      client.ownerUserId === userId,
    position: client.position,
    groupNo: client.groupNo,
    applicationCount: client.applications.length,
  }
}

export interface DeskQueueStats {
  clientCount: number
  applicationCount: number
  longestWaitMinutes: number
  slaBreachCount: number
  totalExposure: number
}

export function summarizeDeskQueue(
  clients: readonly QueuedClientDto[],
  now: number = Date.now(),
  slaPolicy?: Record<string, number> | null,
): DeskQueueStats {
  let applicationCount = 0
  let longestWaitMinutes = 0
  let slaBreachCount = 0
  let totalExposure = 0

  for (const client of clients) {
    const summary = summarizeClient(client, now, slaPolicy)
    applicationCount += summary.applicationCount
    longestWaitMinutes = Math.max(
      longestWaitMinutes,
      minutesSince(summary.oldestEnqueuedAt, now),
    )
    totalExposure += summary.totalAmount
    for (const app of client.applications) {
      if (
        assessAging(app.status as LoanStatus, app.enqueuedAt, now, slaPolicy)
          .tier === 'breach'
      ) {
        slaBreachCount += 1
      }
    }
  }

  return {
    clientCount: clients.length,
    applicationCount,
    longestWaitMinutes,
    slaBreachCount,
    totalExposure,
  }
}
