import axios from 'axios'
import type { AuthTokenResponse } from '@/src/shared/lib/api/types'
import { env } from '@/src/shared/config/env'

let inFlight: Promise<AuthTokenResponse> | null = null

function postRefresh(): Promise<AuthTokenResponse> {
  return axios
    .post<AuthTokenResponse>(
      `${env.apiBaseUrl ?? ''}/api/auth/refresh`,
      null,
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      },
    )
    .then((res) => res.data)
}

/**
 * Single-flight access-token refresh for the whole tab (and other tabs when
 * the Web Locks API is available). Refresh tokens are single-use: two
 * concurrent rotations invalidate each other and force a logout.
 */
export function refreshAuthSession(): Promise<AuthTokenResponse> {
  if (inFlight) return inFlight

  inFlight = (async () => {
    const locks =
      typeof navigator !== 'undefined'
        ? (navigator as Navigator & { locks?: LockManager }).locks
        : undefined

    if (locks) {
      return locks.request('alas-auth-refresh', () => postRefresh())
    }

    return postRefresh()
  })().finally(() => {
    inFlight = null
  })

  return inFlight
}

export function resetAuthRefreshForTests(): void {
  inFlight = null
}
