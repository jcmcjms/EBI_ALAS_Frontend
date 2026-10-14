import { describe, expect, it } from 'vitest'
import {
  deriveWorkflowAction,
  WORKFLOW_ACTIONS,
} from './workflow-constants'

describe('evaluator recommend without remarks', () => {
  it('Recommended action does not require remarks', () => {
    const recommended = WORKFLOW_ACTIONS.find(
      (a) =>
        a.role === 'Evaluator' &&
        a.verdict === 'Recommended' &&
        a.from === 'ForChecking',
    )
    expect(recommended?.remarksRequired).toBe(false)
  })

  it('maps evaluator recommend to evaluate-recommend, not recommender recommend', () => {
    const recommended = WORKFLOW_ACTIONS.find(
      (a) =>
        a.role === 'Evaluator' &&
        a.verdict === 'Recommended' &&
        a.from === 'ForChecking',
    )!
    const action = deriveWorkflowAction(recommended)
    expect(action).toBe('EvaluateRecommend')
  })

  it('still requires remarks for not recommended', () => {
    const notRecommended = WORKFLOW_ACTIONS.find(
      (a) => a.role === 'Evaluator' && a.verdict === 'NotRecommended',
    )
    expect(notRecommended?.remarksRequired).toBe(true)
  })
})
