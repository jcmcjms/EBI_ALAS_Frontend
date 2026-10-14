import { describe, expect, it } from 'vitest'
import { resolveEvaluationVerdict } from '../api/loan-review'

describe('resolveEvaluationVerdict', () => {
  it('maps EvaluatedRecommended to the recommended verdict', () => {
    expect(resolveEvaluationVerdict('EvaluatedRecommended')).toBe(
      'EvaluatedRecommended',
    )
  })

  it('maps EvaluatedNotRecommended to the not-recommended verdict', () => {
    expect(resolveEvaluationVerdict('EvaluatedNotRecommended')).toBe(
      'EvaluatedNotRecommended',
    )
  })

  it('returns null for unrelated actions', () => {
    expect(resolveEvaluationVerdict('Approved')).toBeNull()
    expect(resolveEvaluationVerdict('Encoded')).toBeNull()
    expect(resolveEvaluationVerdict(null)).toBeNull()
  })
})
