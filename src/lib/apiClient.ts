import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toastError } from '@/src/components/ui/toast'
import { useAuthStore } from '../store/authStore.ts'
import { decodeJwtPayload } from '@/src/shared/lib/jwt.ts'

const baseURL = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL

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

function isCsrfFailure(error: AxiosError): boolean {
  if (error.response?.status !== 403) return false
  const data = error.response.data
  if (!data || typeof data !== 'object') return false

  const code = (data as { code?: unknown }).code
  if (
    typeof code === 'string' &&
    code.toUpperCase() === 'CSRF_VALIDATION_FAILED'
  ) {
    return true
  }

  const message = (data as { message?: unknown }).message
  return typeof message === 'string' && /csrf/i.test(message)
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
    const { data: apiResponse } = await axios.post('/api/auth/refresh', null, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    })
    if (apiResponse?.success && apiResponse.data?.accessToken) {
      const newToken: string = apiResponse.data.accessToken
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
      if (import.meta.env.DEV) {
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
      isCsrfFailure(error) &&
      originalRequest &&
      !originalRequest._csrfRetry
    ) {
      const url = originalRequest.url ?? '(unknown)'
      const method = (originalRequest.method ?? '?').toUpperCase()
      if (import.meta.env.DEV) {
        console.warn(
          `[CSRF] Backend rejected ${method} ${url} as CSRF_VALIDATION_FAILED. ` +
            'Attempting silent refresh to mint a fresh XsrfToken claim.',
        )
      }

      if (url === '/api/auth/refresh') {
        toastError('Session security token expired — please log in again.')
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
          if (import.meta.env.DEV) {
            console.error(
              '[CSRF] Refreshed access token still has no XsrfToken claim. ' +
                'Backend must include the claim in issued access JWTs.',
            )
          }
          toastError('Session security token expired — please log in again.')
          return Promise.reject(error)
        }
        headers[CSRF_HEADER] = newXsrf
        originalRequest._csrfRetry = true
        return apiClient(originalRequest)
      } catch {
        toastError('Session security token expired — please log in again.')
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
      useAuthStore.getState().clearSession()
      window.location.href = '/login'
      return Promise.reject(error)
    }
  },
)

function getStatusFallbackMessage(status: number): string {
  if (status === 400)
    return 'The request was invalid. Please check your input and try again.'
  if (status === 401)
    return 'Authentication failed. Please check your credentials and try again.'
  if (status === 403)
    return "You don't have permission to access this. Please contact your administrator if you need access."
  if (status === 404) return 'The requested resource was not found.'
  if (status === 409)
    return 'The operation conflicts with the current state. Please refresh and try again.'
  if (status === 429)
    return 'Too many attempts. Please wait a moment and try again.'
  if (status >= 500) return 'Server error. Please try again later.'
  return 'An unexpected error occurred. Please try again.'
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      if (status === 502)
        return 'Server is temporarily unavailable. Please try again later.'
      if (status === 503)
        return 'Service is currently unavailable. Please try again later.'
      if (status === 504) return 'Server timed out. Please try again later.'

      if (
        typeof data === 'string' &&
        !data.startsWith('<') &&
        data.trim().length > 0
      )
        return data

      if (data?.message) {
        const details =
          Array.isArray(data.errors) && data.errors.length > 0
            ? data.errors.join('. ')
            : null
        return details ? `${data.message}: ${details}` : data.message
      }
      if (data?.error) return data.error
      if (data?.detail) return data.detail

      return getStatusFallbackMessage(status)
    }

    if (error.request) {
      return 'Network error. Please check your connection and try again.'
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error) {
    return error
  }

  return 'An unexpected error occurred. Please try again.'
}
