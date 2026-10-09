import {
  extractUserFromToken,
  type JwtUserSession,
} from '@/src/shared/lib/jwt'
import type { AuthTokenResponse } from '@/src/shared/lib/api/types'

export type { AuthTokenResponse }

export interface AuthSession {
  token: string
  user: JwtUserSession
}

export function readLoginSession(
  body: AuthTokenResponse | null | undefined,
): AuthSession | null {
  if (!body?.accessToken) return null

  const user = extractUserFromToken(body.accessToken, {
    // Only override the JWT claim when the body actually carries a boolean;
    // otherwise an omitted field would silently clear the forced-change gate.
    mustChangePassword:
      typeof body.mustChangePassword === 'boolean'
        ? body.mustChangePassword
        : undefined,
  })
  if (!user) return null

  return { token: body.accessToken, user }
}
