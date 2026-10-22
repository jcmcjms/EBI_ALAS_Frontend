import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetRestoreSession, restoreSession } from '../restore-session'
import { refreshAuthSession, resetAuthRefreshForTests } from '../auth-refresh'
import type { AuthTokenResponse } from '@/src/shared/lib/api/types'

vi.mock('../auth-refresh', () => ({
  refreshAuthSession: vi.fn(),
  resetAuthRefreshForTests: vi.fn(),
}))

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

const refresh = vi.mocked(refreshAuthSession)

describe('restoreSession', () => {
  beforeEach(() => {
    resetRestoreSession()
    vi.mocked(resetAuthRefreshForTests).mockClear()
    refresh.mockReset()
  })

  it('returns a parsed session from the refresh response', async () => {
    refresh.mockResolvedValue(body)

    const session = await restoreSession()

    expect(session?.user.userId).toBe('user-1')
    expect(session?.token).toBe(accessToken)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent restores (StrictMode double-mount)', async () => {
    let resolveRefresh!: (v: AuthTokenResponse) => void
    refresh.mockImplementation(
      () =>
        new Promise<AuthTokenResponse>((resolve) => {
          resolveRefresh = resolve
        }),
    )

    const a = restoreSession()
    const b = restoreSession()
    resolveRefresh(body)

    const [sa, sb] = await Promise.all([a, b])
    expect(sa?.user.userId).toBe('user-1')
    expect(sb).toBe(sa)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('returns null when refresh fails and allows a later retry', async () => {
    refresh.mockRejectedValueOnce(new Error('401'))
    await expect(restoreSession()).resolves.toBeNull()

    resetRestoreSession()
    refresh.mockResolvedValueOnce(body)
    await expect(restoreSession()).resolves.toMatchObject({
      token: accessToken,
    })
  })
})
