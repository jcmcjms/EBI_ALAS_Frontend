import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetRestoreSession, restoreSession } from '../restore-session'
import type { AuthTokenResponse } from '@/src/shared/lib/api/types'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.sig`
}

const accessToken = makeJwt({
  sub: 'user-1',
  role: 'Admin',
  branch: '011',
  permission: ['loans.view'],
  firstName: 'System',
  lastName: 'Administrator',
})

const body: AuthTokenResponse = {
  accessToken,
  accessTokenExpiresAt: '2030-01-01T00:00:00Z',
  mustChangePassword: false,
}

describe('restoreSession', () => {
  beforeEach(() => {
    resetRestoreSession()
  })

  it('returns a parsed session from the refresh response', async () => {
    const requestRefresh = vi.fn().mockResolvedValue(body)

    const session = await restoreSession(requestRefresh)

    expect(session?.user.userId).toBe('user-1')
    expect(session?.token).toBe(accessToken)
    expect(requestRefresh).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent restores (StrictMode double-mount)', async () => {
    let resolveRefresh!: (v: AuthTokenResponse) => void
    const requestRefresh = vi.fn().mockImplementation(
      () =>
        new Promise<AuthTokenResponse>((resolve) => {
          resolveRefresh = resolve
        }),
    )

    const a = restoreSession(requestRefresh)
    const b = restoreSession(requestRefresh)
    resolveRefresh(body)

    const [sa, sb] = await Promise.all([a, b])
    expect(sa?.user.userId).toBe('user-1')
    expect(sb).toBe(sa)
    expect(requestRefresh).toHaveBeenCalledTimes(1)
  })

  it('returns null when refresh fails and allows a later retry', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('401'))
    await expect(restoreSession(failing)).resolves.toBeNull()

    resetRestoreSession()
    const ok = vi.fn().mockResolvedValue(body)
    await expect(restoreSession(ok)).resolves.toMatchObject({
      token: accessToken,
    })
  })
})
