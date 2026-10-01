import { useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/ui/button'
import { ShieldSlash, ArrowLeft, House } from '@phosphor-icons/react'

export default function Forbidden() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6 text-center">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
          <ShieldSlash size={36} weight="duotone" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Access Restricted
          </h1>
          <p className="text-sm text-muted-foreground">
            Your current account role or branch permissions do not allow access
            to this module. Please switch accounts or consult your system administrator.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft size={16} weight="bold" />
            Go Back
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="gap-2"
          >
            <House size={16} weight="bold" />
            Return to Dashboard
          </Button>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        ALAS &bull; Enterprise Bank Inc. Loan Application System
      </p>
    </div>
  )
}

