import { describe, expect, it } from 'vitest'
import { statusVariant } from './branch-columns'

describe('branch status badge', () => {
  it('maps statuses to badge variants', () => {
    expect(statusVariant('Active')).toBe('default')
    expect(statusVariant('Closed')).toBe('secondary')
    expect(statusVariant('Merged')).toBe('outline')
  })
})
