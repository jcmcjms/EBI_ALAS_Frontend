import { type ReactNode } from 'react'
import { useAuthInit } from '@/src/features/auth/hooks/use-auth-init'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { useAuthStore } from '@/src/shared/store/auth-store'

interface AuthInitProviderProps {
  children: ReactNode
}

export function AuthInitProvider({ children }: AuthInitProviderProps) {
  useAuthInit()

  const isInitializing = useAuthStore((state) => state.isInitializing)

  if (isInitializing) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Spinner className="size-10" />
        <p className="text-sm text-muted-foreground">Restoring session...</p>
      </div>
    )
  }

  return <>{children}</>
}
