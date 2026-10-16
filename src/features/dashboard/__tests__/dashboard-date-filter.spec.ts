import { describe, expect, it } from 'vitest'
import {
  dashboardOverviewUrl,
  manilaTodayIso,
} from '../api/dashboard'

describe('dashboard date filter', () => {
  it('formats Manila today as yyyy-MM-dd', () => {
    expect(manilaTodayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('builds overview URL with date query', () => {
    expect(dashboardOverviewUrl('2026-10-09')).toBe(
      '/api/dashboard/overview?date=2026-10-09',
    )
    expect(dashboardOverviewUrl()).toContain('?date=')
  })
})
