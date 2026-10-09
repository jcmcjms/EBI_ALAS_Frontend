import { describe, expect, it } from 'vitest'
import { shouldSyncShellData } from '../shell-data-gate'

describe('shouldSyncShellData', () => {
  it('is false when there is no user', () => {
    expect(shouldSyncShellData(null)).toBe(false)
  })

  it('is false when the user must change password', () => {
    expect(
      shouldSyncShellData({ mustChangePassword: true }),
    ).toBe(false)
  })

  it('is true for an authenticated user who may use the app', () => {
    expect(
      shouldSyncShellData({ mustChangePassword: false }),
    ).toBe(true)
  })
})
