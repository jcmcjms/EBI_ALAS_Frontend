import { describe, expect, it } from 'vitest'
import { canCreateLoan, workQueueStatusesForRole } from '../model/role-focus'

describe('workQueueStatusesForRole', () => {
  it('maps evaluator to checking queue', () => {
    expect(workQueueStatusesForRole('Evaluator')).toEqual(['ForChecking'])
  })
  it('returns empty list for unknown roles', () => {
    expect(workQueueStatusesForRole('Unknown')).toEqual([])
  })
})

describe('canCreateLoan', () => {
  it('allows Encoder and Admin only', () => {
    expect(canCreateLoan('Encoder')).toBe(true)
    expect(canCreateLoan('Admin')).toBe(true)
    expect(canCreateLoan('Approver')).toBe(false)
  })
})
