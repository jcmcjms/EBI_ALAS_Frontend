import { describe, expect, it } from 'vitest'
import {
  collectRemarksInDialog,
  WORKFLOW_ACTIONS,
} from '../pages/approval/workflow-constants'

describe('collectRemarksInDialog', () => {
  it('collects remarks in the dialog for Not Recommended', () => {
    const notRec = WORKFLOW_ACTIONS.find((a) => a.verdict === 'NotRecommended')!
    expect(collectRemarksInDialog(notRec)).toBe(true)
  })

  it('collects remarks in the dialog for Reject', () => {
    const reject = WORKFLOW_ACTIONS.find((a) => a.label === 'Reject')!
    expect(collectRemarksInDialog(reject)).toBe(true)
  })

  it('does not require panel remarks for Approve', () => {
    const approve = WORKFLOW_ACTIONS.find((a) => a.label === 'Approve Loan')!
    expect(collectRemarksInDialog(approve)).toBe(false)
  })

  it('does not use the shared panel editor for push-back (own dialog)', () => {
    const pushBack = WORKFLOW_ACTIONS.find(
      (a) => a.label === 'Push Back to Encoder',
    )!
    expect(collectRemarksInDialog(pushBack)).toBe(false)
  })
})
