import { describe, expect, it } from 'vitest'
import { actionRequiredTaskCount } from '../components/action-required'
import type { IncompleteDocsQueueItem, PushBackItem } from '../types'

describe('actionRequiredTaskCount', () => {
  it('is zero when both lists are empty', () => {
    expect(actionRequiredTaskCount([], [])).toBe(0)
  })

  it('sums pushbacks and incomplete docs', () => {
    const pushBacks: PushBackItem[] = [
      {
        number: 1,
        lamId: 'L1',
        branch: '001',
        date: '2026-10-14T01:00:00Z',
        reason: 'Returned to Enc',
      },
    ]
    const incompleteDocs: IncompleteDocsQueueItem[] = [
      {
        id: 'id-1',
        position: 1,
        lamId: 'L2',
        branch: '001',
        waitingSinceUtc: '2026-10-14T01:00:00Z',
        missingCount: 1,
        clientName: 'C',
        encoderName: 'E',
      },
    ]
    expect(actionRequiredTaskCount(pushBacks, incompleteDocs)).toBe(2)
  })
})
