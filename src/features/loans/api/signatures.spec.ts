import { describe, expect, it } from 'vitest'
import { filterVisibleSignatureSlots, type SignatureSlotDto } from './signatures'

const slots: SignatureSlotDto[] = [
  {
    order: 1,
    action: 'Encode',
    role: 'Encoder',
    jobTitle: 'Account Officer',
    signedByName: null,
    signedByJobTitle: null,
    signedAt: null,
    signatureUrl: null,
  },
  {
    order: 2,
    action: 'Recommend',
    role: 'Recommender',
    jobTitle: 'Branch Head',
    signedByName: null,
    signedByJobTitle: null,
    signedAt: null,
    signatureUrl: null,
  },
  {
    order: 3,
    action: 'Evaluate',
    role: 'Evaluator',
    jobTitle: 'Credit Checker',
    signedByName: null,
    signedByJobTitle: null,
    signedAt: null,
    signatureUrl: null,
  },
]

describe('filterVisibleSignatureSlots', () => {
  it('hides Recommender when recommendation is disabled', () => {
    const visible = filterVisibleSignatureSlots(slots, false)

    expect(visible.map((s) => s.role)).toEqual(['Encoder', 'Evaluator'])
  })

  it('keeps Recommender when recommendation is enabled', () => {
    const visible = filterVisibleSignatureSlots(slots, true)

    expect(visible.map((s) => s.role)).toEqual([
      'Encoder',
      'Recommender',
      'Evaluator',
    ])
  })

  it('keeps all slots when requireRecommendation is unknown', () => {
    expect(filterVisibleSignatureSlots(slots, undefined)).toHaveLength(3)
  })
})
