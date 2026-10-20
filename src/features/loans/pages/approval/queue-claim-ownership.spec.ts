import { describe, expect, it } from 'vitest'
import type {
  QueuedClientDto,
  QueuedLoanDto,
} from '../../hooks/use-desk-queue'
import { resolveQueueState } from '../../model/desk-queue'

function app(overrides: Partial<QueuedLoanDto>): QueuedLoanDto {
  return {
    loanId: 'L1',
    lamId: 'A',
    clientName: 'C',
    position: 1,
    isHead: true,
    ownerUserId: null,
    ownerName: null,
    enqueuedAt: '',
    status: 'ForChecking',
    branchCode: '001',
    productCode: 'A16',
    product: 'A16',
    loanType: null,
    purpose: null,
    proposedAmount: 1,
    termDays: 30,
    applicationDate: '',
    hasDeviations: false,
    ...overrides,
  }
}

function client(overrides: Partial<QueuedClientDto>): QueuedClientDto {
  return {
    groupNo: 'GRP-1',
    clientName: 'C',
    position: 1,
    isHead: true,
    ownerUserId: null,
    ownerName: null,
    enqueuedAt: '',
    applications: [app({ loanId: 'L1' })],
    ...overrides,
  }
}

describe('review desk claim ownership', () => {
  it('treats currentClaim as owned by the caller so evaluator actions unlock', () => {
    const state = resolveQueueState(
      {
        deskLabel: 'Evaluation Desk',
        scopeDescription: '',
        items: [],
        currentClaim: client({
          ownerUserId: 'U1',
          ownerName: 'U',
          applications: [app({ loanId: 'L1' })],
        }),
      },
      'L1',
      'U1',
    )
    expect(state?.isMine).toBe(true)
  })

  it('unlocks every application of a claimed bundle, not just the primary', () => {
    const state = resolveQueueState(
      {
        deskLabel: 'Evaluation Desk',
        scopeDescription: '',
        items: [],
        currentClaim: client({
          ownerUserId: 'U1',
          ownerName: 'U',
          applications: [
            app({ loanId: 'L1' }),
            app({ loanId: 'L2', lamId: 'B' }),
          ],
        }),
      },
      'L2',
      'U1',
    )
    expect(state?.isMine).toBe(true)
    expect(state?.applicationCount).toBe(2)
  })

  it('still uses queued clients for unclaimed loans', () => {
    const state = resolveQueueState(
      {
        deskLabel: 'Evaluation Desk',
        scopeDescription: '',
        items: [client({ applications: [app({ loanId: 'L2' })] })],
        currentClaim: null,
      },
      'L2',
      'U1',
    )
    expect(state?.isMine).toBe(false)
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
