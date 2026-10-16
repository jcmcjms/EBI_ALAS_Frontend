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
    
    
    mustChangePassword:
      typeof body.mustChangePassword === 'boolean'
        ? body.mustChangePassword
        : undefined,
  })
  if (!user) return null

  return { token: body.accessToken, user }
}
