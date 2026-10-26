import {
  Copy,
  Envelope,
  PencilSimple,
  PenNib,
} from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/src/shared/ui/data-display/avatar'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { Label } from '@/src/shared/ui/primitives/label'
import { Switch } from '@/src/shared/ui/primitives/switch'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { toastError, toastSuccess } from '@/src/shared/ui/feedback/toast'
import { cn } from '@/src/shared/lib/utils'
import { ProfileSkeleton } from './account-states'

export interface ProfileStat {
  label: string
  value: string
  suffix?: string
}

export interface DutyAvailability {
  isAvailable: boolean
  isPending: boolean
  onToggle: () => void
}

interface ProfileCardProps {
  fullName: string
  profilePhotoUrl?: string
  role?: string
  branchLabel?: string | null
  stats: ProfileStat[]
  contactRows: {
    icon: typeof Envelope
    text: string
    missing: boolean
    key: string
    sensitive?: boolean
    rawValue?: string
  }[]
  isLoading: boolean
  onEditProfile: () => void
  duty?: DutyAvailability | null
  eSignatureOnFile?: boolean | null
  onViewSecurity?: () => void
}

export function ProfileCard({
  fullName,
  profilePhotoUrl,
  role,
  branchLabel,
  stats,
  contactRows,
  isLoading,
  onEditProfile,
  duty,
  eSignatureOnFile,
  onViewSecurity,
}: ProfileCardProps) {
  return (
    <Card>
      <CardHeader className="border-b bg-muted/30 py-3">
        <CardTitle className="text-sm">Profile</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={onEditProfile}
          >
            <PencilSimple size={14} weight="bold" /> Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-6 text-center">
        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            <Avatar className="h-24 w-24">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={fullName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <AvatarFallback className="text-2xl">
                  {fullName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]!.toUpperCase())
                    .join('')}
                </AvatarFallback>
              )}
            </Avatar>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">
              {fullName}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
              <Badge variant="outline" className="font-normal">
                {role ?? '—'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {branchLabel ?? '—'}
              </span>
            </div>

            <div className="mt-6 grid w-full grid-cols-3 divide-x rounded-md border bg-muted/30">
              {stats.map((s) => (
                <div key={s.label} className="px-2 py-3">
                  <p className="text-lg font-semibold tabular-nums">
                    {s.value}
                    {s.suffix ? (
                      <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                        {s.suffix}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {duty ? (
              <div className="mt-6 flex w-full items-start justify-between gap-3 border-t pt-4 text-left">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label
                      htmlFor="duty-availability"
                      className="text-sm font-medium"
                    >
                      Duty status
                    </Label>
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-normal',
                        duty.isAvailable
                          ? 'border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'border-amber-600/25 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400',
                      )}
                    >
                      {duty.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {duty.isAvailable
                      ? 'You are notified when applications arrive for review.'
                      : 'Application arrival notifications are paused.'}
                  </p>
                </div>
                <Switch
                  id="duty-availability"
                  checked={duty.isAvailable}
                  disabled={duty.isPending}
                  onCheckedChange={duty.onToggle}
                  className="mt-0.5 shrink-0"
                />
              </div>
            ) : null}

            {typeof eSignatureOnFile === 'boolean' && onViewSecurity ? (
              <div className="mt-5 flex w-full items-center gap-3 border-t pt-4 text-left">
                <PenNib
                  size={16}
                  weight="bold"
                  className={cn(
                    'shrink-0',
                    eSignatureOnFile
                      ? 'text-muted-foreground'
                      : 'text-amber-700 dark:text-amber-400',
                  )}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    !eSignatureOnFile && 'italic text-muted-foreground',
                  )}
                >
                  {eSignatureOnFile
                    ? 'E-signature on file'
                    : 'No e-signature on file'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 px-2 text-xs text-primary"
                  onClick={onViewSecurity}
                >
                  {eSignatureOnFile ? 'View' : 'Add'}
                </Button>
              </div>
            ) : null}

            <ul className="mt-5 w-full space-y-3 border-t pt-4 text-left">
              {contactRows.map((row) => (
                <li key={row.key} className="flex items-center gap-3 text-sm">
                  <row.icon
                    size={16}
                    weight="bold"
                    className="shrink-0 text-muted-foreground"
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate',
                      row.missing && 'italic text-muted-foreground',
                    )}
                  >
                    {row.text}
                  </span>
                  {row.sensitive && row.rawValue ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Copy full identifier"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(row.rawValue!)
                          .then(() => toastSuccess('Copied to clipboard'))
                          .catch(() => toastError('Could not copy identifier'))
                      }}
                    >
                      <Copy size={14} weight="bold" />
                    </Button>
                  ) : row.missing && row.key !== 'branch' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary"
                      onClick={onEditProfile}
                    >
                      Add
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
