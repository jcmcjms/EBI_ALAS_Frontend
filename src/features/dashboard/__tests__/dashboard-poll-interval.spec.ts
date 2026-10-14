import { describe, expect, it } from 'vitest'
import { dashboardPollInterval } from '../hooks/use-dashboard-data'

describe('dashboardPollInterval', () => {
  it('disables polling while SignalR is connected', () => {
    expect(dashboardPollInterval(true)).toBe(false)
  })

  it('falls back to 30s polling when SignalR is disconnected', () => {
    expect(dashboardPollInterval(false)).toBe(30_000)
  })
})
