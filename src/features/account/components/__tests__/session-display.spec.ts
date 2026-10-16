import { describe, expect, it } from 'vitest'
import { sessionTitle } from '../session-display'

describe('sessionTitle', () => {
  it('prefers parsed device info', () => {
    expect(
      sessionTitle({ deviceInfo: 'Chrome on Windows', ipAddress: '1.2.3.4' }),
    ).toBe('Chrome on Windows')
  })
  it('falls back to IP when device unknown', () => {
    expect(sessionTitle({ deviceInfo: null, ipAddress: '1.2.3.4' })).toBe(
      'Unknown Device (1.2.3.4)',
    )
  })
  it('falls back to Unknown Device', () => {
    expect(sessionTitle({ deviceInfo: null, ipAddress: null })).toBe(
      'Unknown Device',
    )
  })
})
