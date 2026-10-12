import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { apiClient } from '@/src/shared/lib/apiClient'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.sig`
}

const xsrf = 'AABBCCDDEEFF00112233445566778899'
const accessToken = makeJwt({
  sub: '7f3a1c2e-0000-4000-8000-000000000001',
  unique_name: 'admin',
  role: 'Admin',
  branch: '011',
  fullName: 'System Administrator',
  mustChangePassword: 'true',
  XsrfToken: xsrf,
})

async function captureRequestHeaders(
  run: () => Promise<unknown>,
): Promise<Record<string, unknown>> {
  let captured: Record<string, unknown> = {}
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    captured = { ...config.headers }
    return {
      data: {},
      status: 204,
      statusText: 'No Content',
      headers: {},
      config,
    }
  })

  apiClient.defaults.adapter = adapter as never
  await run()
  return captured
}

describe('apiClient CSRF header', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession()
  })

  it('sends X-XSRF-TOKEN from the access token claim on unsafe methods', async () => {
    useAuthStore.getState().setSession(accessToken, {
      userId: '7f3a1c2e-0000-4000-8000-000000000001',
      firstName: 'System',
      middleName: '',
      lastName: 'Administrator',
      branchId: '011',
      role: 'Admin',
      jobTitle: null,
      permissions: ['*'],
      mustChangePassword: true,
    })

    const headers = await captureRequestHeaders(() =>
      apiClient.post('/api/auth/change-password', {
        currentPassword: 'old',
        newPassword: 'NewPass!2',
      }),
    )

    const headerNames = Object.keys(headers).map((k) => k.toLowerCase())
    expect(headerNames).toContain('x-xsrf-token')
    const xsrfHeader =
      headers['X-XSRF-TOKEN'] ??
      headers['x-xsrf-token'] ??
      headers['X-Xsrf-Token']
    expect(xsrfHeader).toBe(xsrf)
  })

  it('does not send X-XSRF-TOKEN on GET', async () => {
    useAuthStore.getState().setSession(accessToken, {
      userId: '7f3a1c2e-0000-4000-8000-000000000001',
      firstName: 'System',
      middleName: '',
      lastName: 'Administrator',
      branchId: '011',
      role: 'Admin',
      jobTitle: null,
      permissions: ['*'],
      mustChangePassword: true,
    })

    const headers = await captureRequestHeaders(() =>
      apiClient.get('/api/auth/change-password'),
    )
    const headerNames = Object.keys(headers).map((k) => k.toLowerCase())
    expect(headerNames).not.toContain('x-xsrf-token')
  })
})
