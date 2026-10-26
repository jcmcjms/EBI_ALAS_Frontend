import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { toastError } from '@/src/shared/ui/feedback/toast'
import { cn } from '@/src/shared/lib/utils'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { useAccountProfile } from '@/src/features/account/hooks/use-account'
import { setMyDutyAvailability } from '@/src/features/account/api/account'
import { isDutyRole } from '@/src/features/account/types'

export function DutyStatusToggle() {
  const role = useAuthStore((s) => s.user?.role)
  const profileQuery = useAccountProfile()
  const isAvailable = profileQuery.data?.isAvailable !== false

  if (!role || !isDutyRole(role)) {
    return null
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5"
      disabled={profileQuery.isLoading || profileQuery.isFetching}
      onClick={() => {
        const next = !isAvailable
        setMyDutyAvailability(next)
          .then(() => profileQuery.refetch())
          .catch(() => toastError('Could not update availability'))
      }}
    >
      <Badge
        variant="outline"
        className={cn(
          'h-5 px-1.5 text-[10px]',
          isAvailable
            ? 'border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400'
            : 'border-amber-600/25 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400',
        )}
      >
        {isAvailable ? 'Available' : 'Unavailable'}
      </Badge>
    </Button>
  )
}
