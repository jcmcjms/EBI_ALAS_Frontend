import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/src/shared/ui/primitives/button'
import { ShieldSlash, ArrowLeft, House } from '@phosphor-icons/react'

export default function Forbidden() {
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6 text-center">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
          <ShieldSlash size={36} weight="duotone" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            You don't have access to this page
          </h1>
          <p className="text-sm text-muted-foreground">
            Your role or branch doesn't allow this page. Ask an administrator
            if you think you should have access.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.history.back()}
            className="gap-2"
          >
            <ArrowLeft size={16} weight="bold" />
            Go back
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ to: '/dashboard', replace: true })}
            className="gap-2"
          >
            <House size={16} weight="bold" />
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
