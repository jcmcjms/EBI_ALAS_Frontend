import { describe, expect, it } from 'vitest'
import {
  confirmDescriptionFor,
  WORKFLOW_ACTIONS,
} from '../pages/approval/workflow-constants'

describe('confirmDescriptionFor', () => {
  it('describes approve as approval, not rejection', () => {
    const approve = WORKFLOW_ACTIONS.find((a) => a.label === 'Approve Loan')!
    const text = confirmDescriptionFor(approve)
    expect(text).toMatch(/approve/i)
    expect(text).not.toMatch(/reject/i)
  })

  it('describes reject as rejection', () => {
    const reject = WORKFLOW_ACTIONS.find((a) => a.label === 'Reject')!
    const text = confirmDescriptionFor(reject)
    expect(text).toMatch(/reject/i)
  })

  it('describes not-recommended as proceeding to approver', () => {
    const notRec = WORKFLOW_ACTIONS.find(
      (a) => a.verdict === 'NotRecommended',
    )!
    const text = confirmDescriptionFor(notRec)
    expect(text).toMatch(/NOT RECOMMENDED/i)
    expect(text).not.toMatch(/reject the loan/i)
  })

  it('describes return-to-encoder as revision, not rejection', () => {
    const ret = WORKFLOW_ACTIONS.find(
      (a) => a.label === 'Return to Encoder',
    )!
    const text = confirmDescriptionFor(ret)
    expect(text).toMatch(/encoder|revision/i)
    expect(text).not.toMatch(/reject the loan/i)
  })
})
