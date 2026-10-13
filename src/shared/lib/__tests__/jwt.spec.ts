import { describe, expect, it } from 'vitest'
import { extractUserFromToken } from '../jwt'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.sig`
}

describe('extractUserFromToken — backend JWT claims', () => {
  it('maps sub/unique_name/role/branch claims issued by the API', () => {
    const token = makeJwt({
      sub: '7f3a1c2e-0000-4000-8000-000000000001',
      unique_name: 'admin',
      jti: 'jti-1',
      role: 'Admin',
      branch: '011',
    })

    const user = extractUserFromToken(token)

    expect(user).not.toBeNull()
    expect(user?.userId).toBe('7f3a1c2e-0000-4000-8000-000000000001')
    expect(user?.role).toBe('Admin')
    expect(user?.branchId).toBe('011')
  })

  it('collects repeated permission claims into the permissions list', () => {
    const token = makeJwt({
      sub: '1',
      role: 'Admin',
      branch: '011',
      permission: ['loans.view', 'loans.manage', 'users.manage'],
    })

    const user = extractUserFromToken(token)

    expect(user?.permissions).toEqual([
      'loans.view',
      'loans.manage',
      'users.manage',
    ])
  })

  it('accepts mustChangePassword override from the login response body', () => {
    const token = makeJwt({
      sub: '1',
      role: 'Admin',
      branch: '011',
    })

    const user = extractUserFromToken(token, { mustChangePassword: true })

    expect(user?.mustChangePassword).toBe(true)
  })

  it('reads firstName and lastName claims issued by the API', () => {
    const token = makeJwt({
      sub: '1',
      role: 'Admin',
      branch: '011',
      firstName: 'System',
      lastName: 'Administrator',
    })

    const user = extractUserFromToken(token)

    expect(user?.firstName).toBe('System')
    expect(user?.lastName).toBe('Administrator')
  })

  it('splits a fullName claim when structured name claims are missing', () => {
    const token = makeJwt({
      sub: '1',
      role: 'Admin',
      branch: '011',
      fullName: 'Ada Byron Lovelace',
    })

    const user = extractUserFromToken(token)

    expect(user?.firstName).toBe('Ada')
    expect(user?.middleName).toBe('Byron')
    expect(user?.lastName).toBe('Lovelace')
  })

  it('prefers structured name claims over fullName', () => {
    const token = makeJwt({
      sub: '1',
      role: 'Admin',
      branch: '011',
      firstName: 'Ada',
      middleName: 'Byron',
      lastName: 'Lovelace',
      fullName: 'Should Not Win',
    })

    const user = extractUserFromToken(token)

    expect(user?.firstName).toBe('Ada')
    expect(user?.middleName).toBe('Byron')
    expect(user?.lastName).toBe('Lovelace')
  })
})
