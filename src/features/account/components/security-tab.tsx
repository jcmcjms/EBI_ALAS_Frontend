import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Desktop,
  DeviceMobile,
  Key,
  PenNib,
  ShieldCheck,
  Warning,
} from '@phosphor-icons/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/shared/ui/feedback/alert-dialog'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { formatRelativeTime } from '@/src/shared/lib/format'
import {
  useAccountProfile,
  useAccountSessions,
  useRevokeOtherSessions,
  useRevokeSession,
} from '../hooks/use-account'
import type { Session } from '../api/account'
import { PASSWORD_POLICY } from '../types'
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
} from './account-states'
import { formatExpiry, sessionTitle } from './session-display'

type RevokeConfirm =
  | { kind: 'single'; session: Session }
  | { kind: 'others'; count: number }
  | null

interface SecurityTabProps {
  onEditProfile: () => void
}

export function SecurityTab({ onEditProfile }: SecurityTabProps) {
  const navigate = useNavigate()
  const { data: profile } = useAccountProfile()
  const [pageSize, setPageSize] = useState(5)
  const sessionsQuery = useAccountSessions(1, pageSize)
  const revokeSession = useRevokeSession()
  const revokeOthers = useRevokeOtherSessions()
  const [confirm, setConfirm] = useState<RevokeConfirm>(null)

  const sessions = sessionsQuery.data?.items ?? []
  const otherCount = sessions.filter((s) => !s.isCurrent).length

  const orderedSessions = [...sessions].sort(
    (a, b) => Number(b.isCurrent) - Number(a.isCurrent),
  )

  const passwordLabel = profile?.passwordChangedAt
    ? `Last changed ${formatRelativeTime(profile.passwordChangedAt)}`
    : 'Never changed'

  const hasSignature = Boolean(profile?.eSignature)

  const confirmPending =
    confirm?.kind === 'single'
      ? revokeSession.isPending &&
        revokeSession.variables === confirm.session.id
      : confirm?.kind === 'others'
        ? revokeOthers.isPending
        : false

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-muted/30 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Key size={14} weight="bold" className="text-primary" /> Password
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{passwordLabel}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground marker:text-muted-foreground/60">
              {PASSWORD_POLICY.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <Button
            className="gap-2"
            onClick={() => navigate({ to: '/change-password' })}
          >
            <ShieldCheck size={16} weight="bold" /> Change password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b bg-muted/30 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <PenNib size={14} weight="bold" className="text-primary" />
            E-signature
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {profile && hasSignature ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex h-20 w-56 items-center justify-center border bg-white p-2">
                  <img
                    src={profile.eSignature!}
                    alt="Your e-signature"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG on file. It is stamped on the loan workflows you sign.
                </p>
              </div>
              <Button variant="outline" onClick={onEditProfile}>
                Replace
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-amber-600/30 bg-amber-50 px-3 py-2.5 dark:border-amber-500/25 dark:bg-amber-950/30">
              <Warning
                size={15}
                weight="fill"
                className="shrink-0 text-amber-700 dark:text-amber-400"
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 text-sm text-amber-900 dark:text-amber-200">
                No e-signature on file. A PNG signature is required before you
                can sign loan workflows.
              </p>
              <Button size="sm" variant="outline" className="shrink-0" onClick={onEditProfile}>
                Add e-signature
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b bg-muted/30 py-3">
          <CardTitle className="text-sm">Active Sessions</CardTitle>
          {otherCount > 0 && (
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setConfirm({ kind: 'others', count: otherCount })
                }
              >
                Sign out all others ({otherCount})
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {sessionsQuery.isLoading ? (
            <ListSkeleton rows={3} />
          ) : sessionsQuery.isError ? (
            <ErrorState
              message="Failed to load active sessions."
              onRetry={() => sessionsQuery.refetch()}
            />
          ) : sessions.length === 0 ? (
            <EmptyState
              title="No active sessions"
              hint="Devices signed in to your account will appear here."
            />
          ) : (
            <>
              <div className="divide-y">
                {orderedSessions.map((session) => {
                  const isMobile = /android|ios|mobile/i.test(
                    session.deviceInfo ?? '',
                  )
                  const Icon = isMobile ? DeviceMobile : Desktop
                  const absoluteTimes = `Signed in ${new Date(session.createdAt).toLocaleString()}, expires ${new Date(session.expiresAt).toLocaleString()}`
                  return (
                    <div
                      key={session.id}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon size={16} weight="bold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium">
                            {sessionTitle(session)}
                          </p>
                          {session.isCurrent ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 font-normal"
                            >
                              This device
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              disabled={revokeSession.isPending}
                              onClick={() =>
                                setConfirm({ kind: 'single', session })
                              }
                            >
                              Sign out
                            </Button>
                          )}
                        </div>
                        <p
                          className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground"
                          title={absoluteTimes}
                        >
                          {session.ipAddress ? (
                            <span>IP {session.ipAddress}</span>
                          ) : null}
                          <span>
                            Signed in {formatRelativeTime(session.createdAt)}
                          </span>
                          <span>
                            Expires {formatExpiry(session.expiresAt)}
                          </span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              {(sessionsQuery.data?.totalCount ?? 0) > sessions.length && (
                <div className="border-t px-4 py-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageSize((p) => p + 5)}
                  >
                    Show more sessions
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'others'
                ? 'Sign out all other devices?'
                : 'Revoke this session?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'others'
                ? `This signs out ${confirm.count} other device${confirm.count === 1 ? '' : 's'}. Your current session stays active.`
                : `The device "${confirm?.kind === 'single' ? sessionTitle(confirm.session) : ''}" will be signed out immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirm(null)}>
              Keep session
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={confirmPending}
              onClick={() => {
                if (!confirm) return
                if (confirm.kind === 'single')
                  revokeSession.mutate(confirm.session.id)
                else revokeOthers.mutate()
                setConfirm(null)
              }}
            >
              {confirmPending
                ? 'Revoking…'
                : confirm?.kind === 'others'
                  ? 'Sign out others'
                  : 'Revoke session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
