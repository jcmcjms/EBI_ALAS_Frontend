import { describe, expect, it } from 'vitest'
import { readLoginSession } from '../login-session'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.sig`
}

describe('readLoginSession', () => {
  it('reads accessToken from the flat login response body', () => {
    const accessToken = makeJwt({
      sub: 'user-1',
      role: 'Admin',
      branch: '011',
      permission: ['loans.view'],
      fullName: 'System Administrator',
    })

    const session = readLoginSession({
      accessToken,
      refreshToken: 'refresh-token',
      accessTokenExpiresAt: '2030-01-01T00:00:00Z',
      mustChangePassword: false,
    })

    expect(session).not.toBeNull()
    expect(session?.token).toBe(accessToken)
    expect(session?.user.userId).toBe('user-1')
    expect(session?.user.permissions).toContain('loans.view')
    expect(session?.user.mustChangePassword).toBe(false)
    expect(session?.user.firstName).toBe('System')
    expect(session?.user.lastName).toBe('Administrator')
  })

  it('returns null when accessToken is missing', () => {
    const session = readLoginSession({
      accessToken: '',
      refreshToken: 'refresh-token',
      accessTokenExpiresAt: '2030-01-01T00:00:00Z',
      mustChangePassword: true,
    })

    expect(session).toBeNull()
  })

  it('prefers mustChangePassword from the response body over the JWT', () => {
    const accessToken = makeJwt({
      sub: 'user-1',
      role: 'Admin',
      branch: '011',
      mustChangePassword: false,
    })

    const session = readLoginSession({
      accessToken,
      refreshToken: 'r',
      accessTokenExpiresAt: '2030-01-01T00:00:00Z',
      mustChangePassword: true,
    })

    expect(session?.user.mustChangePassword).toBe(true)
  })

  it('keeps JWT mustChangePassword when the body omits the field', () => {
    const accessToken = makeJwt({
      sub: 'user-1',
      role: 'Admin',
      branch: '011',
      mustChangePassword: true,
    })

    const session = readLoginSession({
      accessToken,
      refreshToken: 'r',
      accessTokenExpiresAt: '2030-01-01T00:00:00Z',
      mustChangePassword: undefined as unknown as boolean,
    })

    expect(session?.user.mustChangePassword).toBe(true)
  })

  it('returns null for a malformed access token', () => {
    const session = readLoginSession({
      accessToken: 'not-a-jwt',
      refreshToken: 'r',
      accessTokenExpiresAt: '2030-01-01T00:00:00Z',
      mustChangePassword: false,
    })

    expect(session).toBeNull()
  })
})
