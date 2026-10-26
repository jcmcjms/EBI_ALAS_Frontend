import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toastError } from '@/src/shared/ui/feedback/toast'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { decodeJwtPayload } from '@/src/shared/lib/jwt.ts'
import { refreshAuthSession } from '@/src/shared/lib/auth-refresh'
import { env } from '@/src/shared/config/env'

const baseURL = env.apiBaseUrl

const CSRF_HEADER = 'X-XSRF-TOKEN'

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

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


export function isCsrfError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) return false
  if (error.response.status !== 403) return false
  const data = error.response.data as
    | { title?: string; detail?: string; message?: string }
    | string
    | undefined
  const text =
    typeof data === 'string'
      ? data
      : `${data?.title ?? ''} ${data?.detail ?? ''} ${data?.message ?? ''}`
  return /csrf/i.test(text)
}

/**
 * Current Authorization + CSRF headers, for raw fetch() calls that bypass the
 * axios interceptors (e.g. keepalive flushes during pagehide).
 */
export function buildAuthHeaders(): Record<string, string> {
  const { accessToken } = useAuthStore.getState()
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
    const xsrfToken = extractXsrfToken(accessToken)
    if (xsrfToken) {
      headers[CSRF_HEADER] = xsrfToken
    }
  }
  return headers
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    })
  }
  isRefreshing = true
  try {
    const body = await refreshAuthSession()
    if (body?.accessToken) {
      const newToken: string = body.accessToken
      useAuthStore.getState().setAccessToken(newToken)
      processQueue(null, newToken)
      return newToken
    }
    const err = new Error('Refresh returned no access token')
    processQueue(err, null)
    throw err
  } catch (e) {
    processQueue(e, null)
    throw e
  } finally {
    isRefreshing = false
  }
}

function forceLogoutIfSignedIn(): void {
  const { user, clearSession } = useAuthStore.getState()
  if (!user) return
  clearSession()
  window.location.href = '/login'
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  const method = config.method?.toUpperCase()
  if (method && UNSAFE_METHODS.has(method)) {
    const xsrfToken = extractXsrfToken(accessToken)
    if (xsrfToken) {
      config.headers[CSRF_HEADER] = xsrfToken
    } else if (accessToken) {
      if (env.isDev) {
        console.warn(
          '[CSRF] Authenticated request without XsrfToken claim — backend will reject.',
          { method, url: config.url },
        )
      }
    }
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean
          _csrfRetry?: boolean
        })
      | undefined

    if (
      isCsrfError(error) &&
      originalRequest &&
      !originalRequest._csrfRetry
    ) {
      const url = originalRequest.url ?? '(unknown)'
      const method = (originalRequest.method ?? '?').toUpperCase()
      if (env.isDev) {
        console.warn(
          `[CSRF] Backend rejected ${method} ${url} as CSRF_VALIDATION_FAILED. ` +
            'Attempting silent refresh to mint a fresh XsrfToken claim.',
        )
      }

      if (url === '/api/auth/refresh') {
        toastError('Your session expired. Sign in again.')
        return Promise.reject(error)
      }

      try {
        const newToken = await refreshAccessToken()

        const headers = (originalRequest.headers ??
          {}) as InternalAxiosRequestConfig['headers']
        originalRequest.headers = headers

        headers.Authorization = `Bearer ${newToken}`
        const newXsrf = extractXsrfToken(newToken)
        if (!newXsrf) {
          if (env.isDev) {
            console.error(
              '[CSRF] Refreshed access token still has no XsrfToken claim. ' +
                'Backend must include the claim in issued access JWTs.',
            )
          }
          toastError('Your session expired. Sign in again.')
          return Promise.reject(error)
        }
        headers[CSRF_HEADER] = newXsrf
        originalRequest._csrfRetry = true
        return apiClient(originalRequest)
      } catch {
        toastError('Your session expired. Sign in again.')
        return Promise.reject(error)
      }
    }

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url === '/api/auth/refresh' ||
      originalRequest.url === '/api/auth/login'
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true
    try {
      const newToken = await refreshAccessToken()
      originalRequest.headers.Authorization = `Bearer ${newToken}`

      const newXsrf = extractXsrfToken(newToken)
      if (newXsrf) {
        originalRequest.headers[CSRF_HEADER] = newXsrf
      }
      return apiClient(originalRequest)
    } catch {
      forceLogoutIfSignedIn()
      return Promise.reject(error)
    }
  },
)

function getStatusFallbackMessage(status: number): string {
  if (status === 400)
    return 'The request was invalid. Check your input and try again.'
  if (status === 401)
    return 'Your session may have expired. Sign in again.'
  if (status === 403)
    return "You don't have permission to do this. Ask an administrator if you need access."
  if (status === 404) return "We couldn't find that record. It may have been removed."
  if (status === 409)
    return 'Someone else changed this record. Refresh and try again.'
  if (status === 429)
    return 'Too many requests. Wait a moment and try again.'
  if (status >= 500) return 'Something went wrong on the server. Try again later.'
  return 'Something went wrong. Try again.'
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      if (status === 502)
        return 'The server is temporarily unavailable. Try again later.'
      if (status === 503)
        return 'ALAS is under maintenance. Try again later.'
      if (status === 504) return 'The server took too long to respond. Try again.'

      if (
        typeof data === 'string' &&
        !data.startsWith('<') &&
        data.trim().length > 0
      )
        return data

      if (data?.detail) {
        if (data.detail.includes('•') || data.detail.includes('is missing')) {
          return data.detail
        }
        const list = Array.isArray(data.errors)
          ? data.errors.filter((e: unknown): e is string => typeof e === 'string' && e.trim().length > 0)
          : []
        return list.length > 0
          ? `${data.detail}\n${list.map((e: string) => `• ${e}`).join('\n')}`
          : data.detail
      }
      if (data?.message) {
        const details =
          Array.isArray(data.errors) && data.errors.length > 0
            ? data.errors.join('. ')
            : null
        return details ? `${data.message}: ${details}` : data.message
      }
      if (data?.error) return data.error

      return getStatusFallbackMessage(status)
    }

    if (error.request) {
      return 'Connection problem. Check your internet connection and try again.'
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error) {
    return error
  }

  return 'Something went wrong. Try again.'
}
