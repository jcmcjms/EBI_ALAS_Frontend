import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarBlank,
  CaretRight,
  Envelope,
  IdentificationCard,
  MapPin,
  PencilSimple,
  Phone,
  Sparkle,
} from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/src/shared/ui/avatar'
import { Button } from '@/src/shared/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/card'
import { initialsOf } from '@/src/shared/lib/format'
import { BRANCHES } from '@/src/shared/lib/api/types'
import { useAuthStore } from '@/src/features/auth/store/authStore'
import {
  useAccountProfile,
  useAccountActivity,
  useAccountLoans,
  useAccountClients,
} from '../hooks/use-account'
import type { AccountTab } from '../types'
import { ActivityTimeline, toTimelineItems } from './activity-timeline'
import { EmptyState, ErrorState, LoadingState } from './account-states'
import { ProfileCard } from './profile-card'
import { RecentApplicationsList } from './recent-applications-list'

interface OverviewTabProps {
  onEditProfile: () => void
  onOpenTab: (tab: AccountTab) => void
}

export function OverviewTab({ onEditProfile, onOpenTab }: OverviewTabProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profileQuery = useAccountProfile()
  const activityQuery = useAccountActivity(3)
  const loansQuery = useAccountLoans(3)
  const clientsQuery = useAccountClients(5)

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
    return BRANCHES.find((b) => b.code === code)?.name ?? `Branch ${code}`
  }, [profile, user])

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
      { label: 'Approval', value: `${profile?.stats.approvalRate ?? 0}%` },
    ],
    [profile],
  )

  const contactRows = useMemo(() => {
    const rows: {
      icon: typeof Envelope
      text: string
      missing: boolean
      key: string
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
        text: `Employee ID ${user?.userId ?? profile?.id ?? '—'}`,
        missing: false,
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
      {}
      {missingFields.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <Sparkle
              size={16}
              weight="fill"
              className="shrink-0 text-primary"
            />
            <p className="text-sm text-muted-foreground">
              Your profile is missing your{' '}
              <span className="font-medium text-foreground">
                {missingFields.join(', ')}
              </span>
              .
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onEditProfile}
          >
            <PencilSimple size={14} weight="bold" /> Complete profile
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <ProfileCard
          fullName={fullName}
          profilePhotoUrl={profile?.profilePhotoUrl}
          role={user?.role ?? profile?.role}
          branchLabel={branchLabel}
          stats={stats}
          contactRows={contactRows}
          isLoading={profileQuery.isLoading}
          onEditProfile={onEditProfile}
        />

        {}
        <div className="space-y-6">
          {}
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
              <CardTitle className="text-sm">Latest Activity</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenTab('activity')}
              >
                View all
              </Button>
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

          <div className="grid gap-6 xl:grid-cols-2">
            <RecentApplicationsList
              loansQuery={loansQuery}
              onNewApplication={() => navigate('/loans/create')}
              onViewAll={() => onOpenTab('my-applications')}
            />

            {}
            <Card>
              <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
                <CardTitle className="text-sm">Recent Clients</CardTitle>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Open loan monitoring"
                  onClick={() => navigate('/loans/monitoring')}
                >
                  <CaretRight size={14} weight="bold" />
                </Button>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {clientsQuery.isLoading ? (
                  <LoadingState label="Loading clients…" />
                ) : clientsQuery.isError ? (
                  <ErrorState
                    message="Failed to load recent clients."
                    onRetry={() => clientsQuery.refetch()}
                  />
                ) : (clientsQuery.data ?? []).length === 0 ? (
                  <EmptyState
                    title="No recent clients"
                    hint="Clients from your applications will appear here."
                  />
                ) : (
                  clientsQuery.data!.map((client) => (
                    <div
                      key={client.cisId}
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
                        <p className="truncate text-xs text-muted-foreground">
                          CIS {client.cisId} • {client.agency}
                        </p>
                      </div>
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