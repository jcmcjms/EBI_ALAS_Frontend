import { describe, expect, it } from 'vitest'
import {
  DASHBOARD_POLL_MS,
  dashboardPollInterval,
} from '../hooks/use-dashboard-data'

describe('dashboardPollInterval', () => {
  it('disables polling while SignalR is connected', () => {
    expect(dashboardPollInterval(true)).toBe(false)
  })

  it('falls back to 5-minute polling when SignalR is disconnected', () => {
    expect(DASHBOARD_POLL_MS).toBe(300_000)
    expect(dashboardPollInterval(false)).toBe(300_000)
  })
})
