import { Envelope, PencilSimple } from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/src/shared/ui/data-display/avatar'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { cn } from '@/src/shared/lib/utils'
import { LoadingState } from './account-states'

interface ProfileCardProps {
  fullName: string
  profilePhotoUrl?: string
  role?: string
  branchLabel?: string | null
  stats: { label: string; value: string }[]
  contactRows: {
    icon: typeof Envelope
    text: string
    missing: boolean
    key: string
  }[]
  isLoading: boolean
  onEditProfile: () => void
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
}: ProfileCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
        <CardTitle className="text-sm">Profile</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onEditProfile}
        >
          <PencilSimple size={14} weight="bold" /> Edit
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-6 text-center">
        {isLoading ? (
          <LoadingState label="Loading profile…" />
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
            <div className="mt-4 flex items-center gap-2">
              <h2 className="text-xl font-semibold">{fullName}</h2>
              <Badge
                variant="outline"
                className="border-primary/40 text-primary"
              >
                {role ?? '—'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {branchLabel ?? '—'}
            </p>

            <div className="mt-6 grid w-full grid-cols-3 divide-x rounded-md border bg-muted/30">
              {stats.map((s) => (
                <div key={s.label} className="px-2 py-3">
                  <p className="text-lg font-semibold tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <ul className="mt-6 w-full space-y-3 text-left">
              {contactRows.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center gap-3 text-sm"
                >
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
                  {row.missing && row.key !== 'branch' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary"
                      onClick={onEditProfile}
                    >
                      Add
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}