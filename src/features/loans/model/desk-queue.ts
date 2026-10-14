import type { DeskQueueResponse, QueuedLoanDto } from '../hooks/use-desk-queue'
import { assessAging } from './loan-aging'
import type { LoanStatus } from './loan-status'

const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

export function formatPhp(amount: number): string {
  return Number.isFinite(amount) ? phpFormatter.format(amount) : '\u2014'
}

export function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
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
} | undefined {
  const queueItem: QueuedLoanDto | undefined =
    desk?.items.find((i) => i.loanId === loanId) ??
    (desk?.currentClaim?.loanId === loanId ? desk.currentClaim : undefined)
  if (!queueItem) return undefined
  return {
    isHead: queueItem.isHead,
    ownerUserId: queueItem.ownerUserId,
    ownerName: queueItem.ownerName ?? undefined,
    isMine:
      queueItem.ownerUserId != null &&
      userId != null &&
      queueItem.ownerUserId === userId,
    position: queueItem.position,
  }
}

export interface DeskQueueStats {
  fileCount: number
  longestWaitMinutes: number
  slaBreachCount: number
  totalExposure: number
}

export function summarizeDeskQueue(
  items: readonly QueuedLoanDto[],
  now: number = Date.now(),
): DeskQueueStats {
  let longestWaitMinutes = 0
  let slaBreachCount = 0
  let totalExposure = 0

  for (const item of items) {
    longestWaitMinutes = Math.max(
      longestWaitMinutes,
      minutesSince(item.enqueuedAt, now),
    )
    if (
      assessAging(item.status as LoanStatus, item.enqueuedAt, now).tier ===
      'breach'
    ) {
      slaBreachCount += 1
    }
    totalExposure += Number.isFinite(item.proposedAmount)
      ? item.proposedAmount
      : 0
  }

  return {
    fileCount: items.length,
    longestWaitMinutes,
    slaBreachCount,
    totalExposure,
  }
}
