import { describe, expect, it } from 'vitest'
import { decodeJwtPayload } from '../jwt'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.sig`
}


function extractXsrfToken(jwt: string | null): string | null {
  if (!jwt) return null
  const parts = jwt.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = decodeJwtPayload(jwt) as { XsrfToken?: unknown } | null
    return typeof payload?.XsrfToken === 'string' ? payload.XsrfToken : null
  } catch {
    return null
  }
}

describe('XsrfToken extraction from access JWT', () => {
  it('reads the XsrfToken claim name emitted by JwtTokenService', () => {
    const token = makeJwt({
      sub: '7f3a1c2e-0000-4000-8000-000000000001',
      unique_name: 'admin',
      jti: 'jti-1',
      role: 'Admin',
      branch: '011',
      fullName: 'System Administrator',
      mustChangePassword: 'true',
      XsrfToken: 'AABBCCDDEEFF00112233445566778899',
      permission: ['loans.view', 'users.manage'],
    })

    expect(extractXsrfToken(token)).toBe('AABBCCDDEEFF00112233445566778899')
  })

  it('returns null when the claim is absent', () => {
    const token = makeJwt({ sub: '1', role: 'Admin', branch: '011' })
    expect(extractXsrfToken(token)).toBeNull()
  })

  it('returns null when the claim uses unexpected casing', () => {
    const token = makeJwt({ sub: '1', xsrfToken: 'abc' })
    expect(extractXsrfToken(token)).toBeNull()
  })
})
