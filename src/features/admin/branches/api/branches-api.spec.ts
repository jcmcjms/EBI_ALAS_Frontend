import { describe, expect, it } from 'vitest'
import { findBranchName } from '@/src/shared/lib/api/branches'
import { parseBranchStatus } from './branches-api'

describe('branch api helpers', () => {
  it('findBranchName resolves code to name and falls back to code', () => {
    const branches = [
      {
        code: '011',
        name: 'Head Office Branch',
        areaCode: 'NA',
        status: 'Active' as const,
        createdAt: '',
        updatedAt: '',
      },
    ]
    expect(findBranchName(branches, '011')).toBe('Head Office Branch')
    expect(findBranchName(branches, '999')).toBe('999')
    expect(findBranchName(undefined, '011')).toBe('011')
    expect(findBranchName(branches, null)).toBe('')
  })

  it('parseBranchStatus accepts known values and rejects unknown', () => {
    expect(parseBranchStatus('Active')).toBe('Active')
    expect(parseBranchStatus('Closed')).toBe('Closed')
    expect(parseBranchStatus('Merged')).toBe('Merged')
    expect(() => parseBranchStatus('Nope')).toThrow()
  })
})
