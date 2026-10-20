import { describe, expect, it } from 'vitest'

import type {
  QueuedClientDto,
  QueuedLoanDto,
} from '../../hooks/use-desk-queue'
import {
  formatPhp,
  minutesSince,
  resolveQueueState,
  summarizeClient,
  summarizeDeskQueue,
} from '../desk-queue'

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

function client(overrides: Partial<QueuedClientDto>): QueuedClientDto {
  return {
    groupNo: 'GRP-1',
    clientName: 'REJEN MANLIGUIS',
    position: 1,
    isHead: true,
    ownerUserId: null,
    ownerName: null,
    enqueuedAt: new Date(NOW - 60 * 60_000).toISOString(),
    applications: [queued({})],
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

describe('summarizeClient', () => {
  it('aggregates a bundle into totals, oldest wait and worst aging', () => {
    const summary = summarizeClient(
      client({
        applications: [
          queued({
            loanId: 'L1',
            enqueuedAt: new Date(NOW - 9 * 3_600_000).toISOString(),
            proposedAmount: 322_000,
          }),
          queued({
            loanId: 'L2',
            lamId: 'LAM-20260929-000002',
            enqueuedAt: new Date(NOW - 60 * 60_000).toISOString(),
            proposedAmount: 386_000,
            hasDeviations: true,
          }),
        ],
      }),
      NOW,
    )

    expect(summary.applicationCount).toBe(2)
    expect(summary.totalAmount).toBe(708_000)
    expect(summary.oldestEnqueuedAt).toBe(
      new Date(NOW - 9 * 3_600_000).toISOString(),
    )
    expect(summary.worstAging.tier).toBe('breach')
    expect(summary.hasDeviations).toBe(true)
    expect(summary.branchCode).toBe('006')
  })
})

describe('summarizeDeskQueue', () => {
  it('counts clients and applications, exposure and SLA breaches', () => {
    const stats = summarizeDeskQueue(
      [
        client({
          enqueuedAt: new Date(NOW - 9 * 3_600_000).toISOString(),
          applications: [
            queued({
              loanId: 'L1',
              enqueuedAt: new Date(NOW - 9 * 3_600_000).toISOString(),
            }),
            queued({
              loanId: 'L2',
              lamId: 'LAM-20260929-000002',
              proposedAmount: 386_000,
              enqueuedAt: new Date(NOW - 9 * 3_600_000).toISOString(),
            }),
          ],
        }),
        client({
          groupNo: 'GRP-2',
          position: 2,
          isHead: false,
          applications: [
            queued({
              loanId: 'L3',
              lamId: 'LAM-20260929-000003',
              proposedAmount: 100_000,
              enqueuedAt: new Date(NOW - 30 * 60_000).toISOString(),
            }),
          ],
        }),
      ],
      NOW,
    )

    expect(stats).toEqual({
      clientCount: 2,
      applicationCount: 3,
      longestWaitMinutes: 540,
      slaBreachCount: 2,
      totalExposure: 808_000,
    })
  })
})

describe('resolveQueueState', () => {
  it('finds a sibling application inside the claimed bundle', () => {
    const state = resolveQueueState(
      {
        deskLabel: 'Evaluation Desk',
        scopeDescription: '',
        items: [],
        currentClaim: client({
          ownerUserId: 'U1',
          ownerName: 'Reviewer',
          applications: [
            queued({ loanId: 'L1' }),
            queued({ loanId: 'L2', lamId: 'LAM-2' }),
          ],
        }),
      },
      'L2',
      'U1',
    )

    expect(state?.isMine).toBe(true)
    expect(state?.groupNo).toBe('GRP-1')
    expect(state?.applicationCount).toBe(2)
  })

  it('still uses queued clients for unclaimed loans', () => {
    const state = resolveQueueState(
      {
        deskLabel: 'Evaluation Desk',
        scopeDescription: '',
        items: [client({ applications: [queued({ loanId: 'L2' })] })],
        currentClaim: null,
      },
      'L2',
      'U1',
    )
    expect(state?.isMine).toBe(false)
    expect(state?.position).toBe(1)
  })

  it('returns undefined when the loan is not on this desk', () => {
    expect(
      resolveQueueState(
        {
          deskLabel: 'Evaluation Desk',
          scopeDescription: '',
          items: [],
          currentClaim: null,
        },
        'L3',
        'U1',
      ),
    ).toBeUndefined()
  })
})
