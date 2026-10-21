import type { AuthTokenResponse } from '@/src/shared/lib/api/types'
import { extractUserFromToken } from '@/src/shared/lib/jwt'

export interface AuthSession {
  token: string
  user: NonNullable<ReturnType<typeof extractUserFromToken>>
}

export function readLoginSession(
  body: AuthTokenResponse | null | undefined,
): AuthSession | null {
  if (!body?.accessToken) return null

  const user = extractUserFromToken(body.accessToken, {
    mustChangePassword:
      typeof body.mustChangePassword === 'boolean'
        ? body.mustChangePassword
        : undefined,
  })
  if (!user) return null

  return { token: body.accessToken, user }
}

/**
 * One session restore per page load. React StrictMode (and any double-mount)
 * must not fire two concurrent /api/auth/refresh calls: refresh rotation
 * revokes the first token and the second request 401s, logging the user out.
 */
let pageRestore: Promise<AuthSession | null> | null = null

export function restoreSession(
  requestRefresh: () => Promise<AuthTokenResponse>,
): Promise<AuthSession | null> {
  if (!pageRestore) {
    pageRestore = requestRefresh()
      .then((body) => readLoginSession(body))
      .catch(() => null)
  }
  return pageRestore
}

/** Drop the cached restore so the next mount may try again (e.g. after logout). */
export function resetRestoreSession(): void {
  pageRestore = null
}
