import { describe, expect, it } from 'vitest'
import { resolveQueueState } from '../../model/desk-queue'

describe('review desk claim ownership', () => {
  it('treats currentClaim as owned by the caller so evaluator actions unlock', () => {
    const state = resolveQueueState(
      {
        deskLabel: 'Evaluation Desk',
        scopeDescription: '',
        items: [],
        currentClaim: {
          loanId: 'L1',
          lamId: 'A',
          clientName: 'C',
          position: 1,
          isHead: true,
          ownerUserId: 'U1',
          ownerName: 'U',
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
        },
      },
      'L1',
      'U1',
    )
    expect(state?.isMine).toBe(true)
  })

  it('still uses queued items for unclaimed loans', () => {
    const queued = {
      loanId: 'L2',
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
    }
    const state = resolveQueueState(
      {
        deskLabel: 'Evaluation Desk',
        scopeDescription: '',
        items: [queued],
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
