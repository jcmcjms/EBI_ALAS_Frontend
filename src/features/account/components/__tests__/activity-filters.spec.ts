import { describe, expect, it } from 'vitest'
import { buildActivityQuery } from '../../api/activity-query'

describe('buildActivityQuery', () => {
  it('includes from/to/action when set', () => {
    const q = buildActivityQuery(10, {
      from: '2026-10-01',
      to: '2026-10-16',
      action: 'login',
    })
    expect(q).toContain('limit=10')
    expect(q).toContain('from=2026-10-01')
    expect(q).toContain('to=2026-10-16')
    expect(q).toContain('action=login')
  })
  it('omits empty filters', () => {
    expect(buildActivityQuery(5, {})).toBe('limit=5')
  })
})
