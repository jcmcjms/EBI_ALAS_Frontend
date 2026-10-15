import { describe, it, expect } from 'vitest'
import { describeEvent } from './loan-timeline'

describe('describeEvent', () => {
  it("returns 'Submitted for evaluation' for Draft -> ForChecking", () => {
    const result = describeEvent({
      id: '1',
      type: 'workflow',
      occurredAtUtc: new Date().toISOString(),
      actorName: 'Tester',
      actorRole: 'Encoder',
      action: 'StatusChanged',
      fromStatus: 'Draft',
      toStatus: 'ForChecking',
      comment: null,
      subject: null,
      subjectCode: null,
    })
    expect(result.headline).toBe('Submitted for evaluation')
  })

  it("returns 'Submitted for recommendation' for Draft -> ForRecommendation", () => {
    const result = describeEvent({
      id: '2',
      type: 'workflow',
      occurredAtUtc: new Date().toISOString(),
      actorName: 'Tester',
      actorRole: 'Encoder',
      action: 'StatusChanged',
      fromStatus: 'Draft',
      toStatus: 'ForRecommendation',
      comment: null,
      subject: null,
      subjectCode: null,
    })
    expect(result.headline).toBe('Submitted for recommendation')
  })

  it("returns 'Submitted for approval' for Draft -> ForApproval", () => {
    const result = describeEvent({
      id: '3',
      type: 'workflow',
      occurredAtUtc: new Date().toISOString(),
      actorName: 'Tester',
      actorRole: 'Encoder',
      action: 'StatusChanged',
      fromStatus: 'Draft',
      toStatus: 'ForApproval',
      comment: null,
      subject: null,
      subjectCode: null,
    })
    expect(result.headline).toBe('Submitted for approval')
  })

  it('describes Revised resubmits, not as a recommendation', () => {
    const result = describeEvent({
      id: '4',
      type: 'workflow',
      occurredAtUtc: new Date().toISOString(),
      actorName: 'Encoder',
      actorRole: 'Encoder',
      action: 'Revised',
      fromStatus: 'ForRevision',
      toStatus: 'ForChecking',
      comment: 'Fixed address',
      subject: null,
      subjectCode: null,
    })
    expect(result.headline).toBe('Resubmitted after corrections')
    expect(result.headline).not.toMatch(/recommend/i)
  })

  it('describes ForRevision -> ForRecommendation as resubmission', () => {
    const result = describeEvent({
      id: '5',
      type: 'workflow',
      occurredAtUtc: new Date().toISOString(),
      actorName: 'Encoder',
      actorRole: 'Encoder',
      action: 'Revised',
      fromStatus: 'ForRevision',
      toStatus: 'ForRecommendation',
      comment: null,
      subject: null,
      subjectCode: null,
    })
    expect(result.headline).toBe('Resubmitted for recommendation')
  })
})
