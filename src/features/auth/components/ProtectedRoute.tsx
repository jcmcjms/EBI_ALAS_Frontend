import { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { env } from '@/src/shared/config/env'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** All listed permissions are required (AND). */
  requiredPermission?: string | string[]
  /** At least one listed permission is required (OR). */
  requiredAnyPermission?: string[]
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredAnyPermission,
}: ProtectedRouteProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const isInitializing = useAuthStore((state) => state.isInitializing)
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission)

  let redirectTo: '/login' | '/change-password' | '/forbidden' | null = null

  if (!accessToken || !user) {
    redirectTo = '/login'
  } else if (user.mustChangePassword && location.pathname !== '/change-password') {
    redirectTo = '/change-password'
  } else if (requiredPermission && !hasPermission(requiredPermission)) {
    if (env.isDev && location.pathname !== '/forbidden') {
      console.warn('[Security] Unauthorized access attempt:', {
        requiredPermission,
        path: location.pathname,
      })
    }
    redirectTo = '/forbidden'
  } else if (
    requiredAnyPermission?.length &&
    !hasAnyPermission(requiredAnyPermission)
  ) {
    if (env.isDev && location.pathname !== '/forbidden') {
      console.warn('[Security] Unauthorized access attempt:', {
        requiredAnyPermission,
        path: location.pathname,
      })
    }
    redirectTo = '/forbidden'
  }

  useEffect(() => {
    if (!redirectTo) return
    navigate({ to: redirectTo, replace: true })
  }, [redirectTo, navigate])

  if (isInitializing || redirectTo) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Spinner className="size-8" />
      </div>
    )
  }

  return <>{children}</>
}
