import { useEffect } from 'react'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { apiClient } from '@/src/shared/lib/apiClient'
import { toastError } from '@/src/shared/ui/feedback/toast'
import {
  readLoginSession,
  type AuthTokenResponse,
} from '@/src/features/auth/login-session'

export function useAuthInit(): void {
  const setSession = useAuthStore((state) => state.setSession)
  const setInitializing = useAuthStore((state) => state.setInitializing)

  useEffect(() => {
    let cancelled = false

    setInitializing(true)

    const initAuth = async () => {
      try {
        const { data } = await apiClient.post<AuthTokenResponse>(
          '/api/auth/refresh',
        )
        const session = readLoginSession(data)

        if (!cancelled && session) {
          setSession(session.token, session.user)
        }
      } catch (error) {
        const axiosError = error as { response?: { status?: number } }
        const status = axiosError?.response?.status
        if (status === 502) {
          toastError(
            'Server is temporarily unavailable. Please try again later.',
          )
        } else if (status === 401 || status === 403) {
          // No session is the expected cold-start path; stay signed out silently.
        } else if (!axiosError?.response) {
          toastError(
            'Unable to connect to the server. Please check your network connection.',
          )
        } else {
          toastError('Failed to restore session. Please log in again.')
        }
      } finally {
        if (!cancelled) {
          setInitializing(false)
        }
      }
    }

    initAuth()

    return () => {
      cancelled = true
    }
  }, [setSession, setInitializing])
}
