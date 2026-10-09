import { describe, expect, it } from 'vitest'

import type { QueuedLoanDto } from '../../hooks/use-desk-queue'
import { formatPhp, minutesSince, summarizeDeskQueue } from '../desk-queue'

const NOW = Date.parse('2026-09-29T15:00:00Z')

function queued(overrides: Partial<QueuedLoanDto>): QueuedLoanDto {
  return {
    loanId: '11111111-1111-1111-1111-111111111111',
    lamId: 'LAM-20260929-000001',
    clientName: 'REJEN MANLIGUIS',
    position: 1,
    isHead: true,
    ownerUserId: null,
    ownerName: null,
    enqueuedAt: new Date(NOW - 60 * 60_000).toISOString(),
    status: 'ForChecking',
    branchCode: '006',
    productCode: 'A16',
    product: 'AFOS-RPSU 1-7YR',
    loanType: 'Reloan',
    purpose: null,
    proposedAmount: 322_000,
    termDays: 730,
    applicationDate: new Date(NOW - 60 * 60_000).toISOString(),
    hasDeviations: false,
    ...overrides,
  }
}

describe('formatPhp', () => {
  it('renders whole-peso banking amounts', () => {
    expect(formatPhp(386_000)).toBe('\u20B1386,000')
  })
})

describe('minutesSince', () => {
  it('floors to whole minutes and clamps negative deltas', () => {
    expect(minutesSince(new Date(NOW - 90_000).toISOString(), NOW)).toBe(1)
    expect(minutesSince(new Date(NOW + 90_000).toISOString(), NOW)).toBe(0)
  })
})

describe('summarizeDeskQueue', () => {
  it('aggregates depth, longest wait, SLA breaches and exposure', () => {
    const stats = summarizeDeskQueue(
      [
        queued({ enqueuedAt: new Date(NOW - 9 * 3_600_000).toISOString() }),
        queued({
          loanId: '22222222-2222-2222-2222-222222222222',
          position: 2,
          isHead: false,
          proposedAmount: 386_000,
        }),
      ],
      NOW,
    )

    expect(stats).toEqual({
      fileCount: 2,
      longestWaitMinutes: 540,
      slaBreachCount: 1,
      totalExposure: 708_000,
    })
  })
})
