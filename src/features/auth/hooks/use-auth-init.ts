import { useEffect } from 'react'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { restoreSession } from '@/src/shared/lib/restore-session'

export function useAuthInit(): void {
  const setSession = useAuthStore((state) => state.setSession)
  const setInitializing = useAuthStore((state) => state.setInitializing)

  useEffect(() => {
    let cancelled = false

    setInitializing(true)

    void restoreSession()
      .then((session) => {
        if (!cancelled && session) {
          setSession(session.token, session.user)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInitializing(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [setSession, setInitializing])
}
