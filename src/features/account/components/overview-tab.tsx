import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CalendarBlank,
  CaretRight,
  Envelope,
  IdentificationCard,
  MapPin,
  Phone,
  Warning,
} from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/src/shared/ui/data-display/avatar'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { formatRelativeTime, initialsOf } from '@/src/shared/lib/format'
import { useBranches, findBranchName } from '@/src/shared/lib/api/branches'
import { useAuthStore } from '@/src/shared/store/auth-store'
import {
  useAccountProfile,
  useAccountActivity,
  useAccountLoans,
  useAccountClients,
} from '../hooks/use-account'
import { setMyDutyAvailability } from '../api/account'
import { toastError } from '@/src/shared/ui/feedback/toast'
import { isDutyRole, type AccountTab } from '../types'
import { ActivityTimeline, toTimelineItems } from './activity-timeline'
import { EmptyState, ErrorState, LoadingState } from './account-states'
import { ProfileCard } from './profile-card'
import { RecentApplicationsList } from './recent-applications-list'
import { maskEmployeeId } from './employee-id'

interface OverviewTabProps {
  onEditProfile: () => void
  onOpenTab: (tab: AccountTab) => void
}

export function OverviewTab({ onEditProfile, onOpenTab }: OverviewTabProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profileQuery = useAccountProfile()
  const activityQuery = useAccountActivity(3)
  const loansQuery = useAccountLoans(4)
  const clientsQuery = useAccountClients(4)
  const { data: branches } = useBranches()
  const [dutyPending, setDutyPending] = useState(false)

  const profile = profileQuery.data

  const fullName = useMemo(() => {
    if (profile) {
      const middle = profile.middleName ? ` ${profile.middleName}` : ''
      return `${profile.firstName}${middle} ${profile.lastName}`.trim()
    }
    return user ? `${user.firstName} ${user.lastName}`.trim() : 'Guest'
  }, [profile, user])

  const branchLabel = useMemo(() => {
    const code = profile?.branchId ?? user?.branchId
    if (!code) return null
    return findBranchName(branches, code) || `Branch ${code}`
  }, [profile, user, branches])

  const missingFields = useMemo(() => {
    if (!profile) return []
    return [
      !profile.email && 'email',
      !profile.phone && 'phone number',
      !profile.emergencyContact && 'emergency contact',
    ].filter((f): f is string => Boolean(f))
  }, [profile])

  const stats = useMemo(
    () => [
      { label: 'Processed', value: String(profile?.stats.processedLoans ?? 0) },
      { label: 'Pending', value: String(profile?.stats.pendingLoans ?? 0) },
      {
        label: 'Approval',
        value: String(profile?.stats.approvalRate ?? 0),
        suffix: '%',
      },
    ],
    [profile],
  )

  const isAvailable = profile?.isAvailable !== false
  const duty =
    profile && isDutyRole(user?.role ?? profile.role)
      ? {
          isAvailable,
          isPending: dutyPending || profileQuery.isFetching,
          onToggle: () => {
            setDutyPending(true)
            setMyDutyAvailability(!isAvailable)
              .then(() => profileQuery.refetch())
              .catch(() => toastError('Could not update availability'))
              .finally(() => setDutyPending(false))
          },
        }
      : null

  const clients = clientsQuery.data
  const uniqueClients = useMemo(() => {
    const seen = new Set<string>()
    const result: NonNullable<typeof clients> = []
    for (const client of clients ?? []) {
      const key = client.cisId ?? client.name
      if (seen.has(key)) continue
      seen.add(key)
      result.push(client)
    }
    return result
  }, [clients])

  const contactRows = useMemo(() => {
    const rawEmployeeId = String(user?.userId ?? profile?.id ?? '')
    const rows: {
      icon: typeof Envelope
      text: string
      missing: boolean
      key: string
      sensitive?: boolean
      rawValue?: string
    }[] = [
      {
        key: 'email',
        icon: Envelope,
        text: profile?.email ?? 'No email on file',
        missing: !profile?.email,
      },
      {
        key: 'phone',
        icon: Phone,
        text: profile?.phone ?? 'No phone on file',
        missing: !profile?.phone,
      },
      {
        key: 'branch',
        icon: MapPin,
        text: branchLabel ?? 'No branch assigned',
        missing: !branchLabel,
      },
      {
        key: 'employee',
        icon: IdentificationCard,
        text: `Employee ID ${maskEmployeeId(rawEmployeeId)}`,
        missing: false,
        sensitive: true,
        rawValue: rawEmployeeId,
      },
    ]
    if (profile?.createdAt) {
      rows.push({
        key: 'joined',
        icon: CalendarBlank,
        text: `Joined ${new Date(profile.createdAt).toLocaleDateString(
          'en-PH',
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        )}`,
        missing: false,
      })
    }
    return rows
  }, [profile, user, branchLabel])

  if (profileQuery.isError) {
    return (
      <Card className="mt-6">
        <CardContent>
          <ErrorState
            message="Failed to load your account profile."
            onRetry={() => profileQuery.refetch()}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {missingFields.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-amber-600/30 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-950/30">
          <Warning
            size={16}
            weight="fill"
            className="shrink-0 text-amber-700 dark:text-amber-400"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 text-sm text-amber-900 dark:text-amber-200">
            Your profile is missing your{' '}
            {missingFields.length === 1
              ? missingFields[0]
              : `${missingFields.slice(0, -1).join(', ')} and ${missingFields.at(-1)}`}
            . Add {missingFields.length === 1 ? 'it' : 'them'} to keep account
            recovery and notifications working.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-600/40 bg-background text-amber-900 hover:bg-amber-100/60 hover:text-amber-900 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
            onClick={onEditProfile}
          >
            Complete profile
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <ProfileCard
          fullName={fullName}
          profilePhotoUrl={profile?.profilePhotoUrl}
          role={user?.role ?? profile?.role}
          branchLabel={branchLabel}
          stats={stats}
          contactRows={contactRows}
          isLoading={profileQuery.isLoading}
          onEditProfile={onEditProfile}
          duty={duty}
          eSignatureOnFile={
            profile ? Boolean(profile.eSignature) : null
          }
          onViewSecurity={() => onOpenTab('security')}
        />

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b bg-muted/30 py-3">
              <CardTitle className="text-sm">Latest Activity</CardTitle>
              <CardAction>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenTab('activity')}
                >
                  View all
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-6">
              {activityQuery.isLoading ? (
                <LoadingState label="Loading activity…" />
              ) : activityQuery.isError ? (
                <ErrorState
                  message="Failed to load recent activity."
                  onRetry={() => activityQuery.refetch()}
                />
              ) : toTimelineItems(activityQuery.data ?? []).length === 0 ? (
                <EmptyState
                  title="No recent activity"
                  hint="Actions you take on loan applications will appear here."
                />
              ) : (
                <ActivityTimeline
                  items={toTimelineItems(activityQuery.data ?? [])}
                />
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 flex-1 gap-6 xl:grid-cols-2">
            <RecentApplicationsList
              loansQuery={loansQuery}
              onNewApplication={() => navigate({ to: '/loans/create' })}
              onViewAll={() => onOpenTab('my-applications')}
            />

            <Card>
              <CardHeader className="border-b bg-muted/30 py-3">
                <CardTitle className="text-sm">Recent Clients</CardTitle>
                <CardAction>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Open loan monitoring"
                    onClick={() => navigate({ to: '/loans/monitoring' })}
                  >
                    <CaretRight size={14} weight="bold" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {clientsQuery.isLoading ? (
                  <LoadingState label="Loading clients…" />
                ) : clientsQuery.isError ? (
                  <ErrorState
                    message="Failed to load recent clients."
                    onRetry={() => clientsQuery.refetch()}
                  />
                ) : uniqueClients.length === 0 ? (
                  <EmptyState
                    title="No recent clients"
                    hint="Clients from your applications will appear here."
                  />
                ) : (
                  uniqueClients.map((client) => (
                    <div
                      key={client.cisId ?? client.name}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Avatar>
                        <AvatarFallback>
                          {initialsOf(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {client.name}
                        </p>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          {client.cisId ? (
                            <span className="shrink-0 tabular-nums">
                              CIS {client.cisId}
                            </span>
                          ) : null}
                          <span className="truncate">{client.agency}</span>
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-xs text-muted-foreground"
                        title={new Date(
                          client.lastInteraction,
                        ).toLocaleString()}
                      >
                        {formatRelativeTime(client.lastInteraction)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
