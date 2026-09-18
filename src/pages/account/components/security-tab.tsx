import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Desktop, DeviceMobile, Key, ShieldCheck } from "@phosphor-icons/react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useAccountProfile, useAccountSessions, useRevokeOtherSessions, useRevokeSession } from "@/src/hooks/useAccount";
import { formatRelativeTime } from "@/src/lib/notifications";
import type { Session } from "@/src/lib/api/account";
import { EmptyState, ErrorState, LoadingState } from "./account-states";

const PASSWORD_POLICY = [
    "Rotate every 90 days",
    "Minimum 8 characters",
    "Upper, lower, digit and a symbol (! ? * .)",
];

const ROTATION_DAYS = 90;

type RevokeConfirm = { kind: "single"; session: Session } | { kind: "others"; count: number } | null;

export function SecurityTab() {
    const navigate = useNavigate();
    const { data: profile } = useAccountProfile();
    const [pageSize, setPageSize] = useState(5);
    const sessionsQuery = useAccountSessions(1, pageSize);
    const revokeSession = useRevokeSession();
    const revokeOthers = useRevokeOtherSessions();
    const [confirm, setConfirm] = useState<RevokeConfirm>(null);

    const sessions = sessionsQuery.data?.items ?? [];
    const otherCount = sessions.filter((s) => !s.isCurrent).length;

    // Current session first, then most recent — the row you can't revoke
    // should never be buried mid-list.
    const orderedSessions = useMemo(
        () => [...sessions].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent)),
        [sessions],
    );

    const rotation = useMemo(() => {
        if (!profile?.passwordChangedAt) return { label: "Never changed", overdue: true };
        const days = Math.floor((Date.now() - new Date(profile.passwordChangedAt).getTime()) / 86_400_000);
        return {
            label: `Last changed ${formatRelativeTime(profile.passwordChangedAt)}`,
            overdue: days >= ROTATION_DAYS,
        };
    }, [profile]);

    const confirmPending =
        confirm?.kind === "single"
            ? revokeSession.isPending && revokeSession.variables === confirm.session.id
            : confirm?.kind === "others"
              ? revokeOthers.isPending
              : false;

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
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{rotation.label}</p>
                            {rotation.overdue && (
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 font-normal text-amber-700">
                                    Rotation due
                                </Badge>
                            )}
                        </div>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                            {PASSWORD_POLICY.map((rule) => (
                                <li key={rule}>• {rule}</li>
                            ))}
                        </ul>
                    </div>
                    <Button className="gap-2" onClick={() => navigate("/change-password")}>
                        <ShieldCheck size={16} weight="bold" /> Change password
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
                    <CardTitle className="text-sm">Active Sessions</CardTitle>
                    {otherCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirm({ kind: "others", count: otherCount })}
                        >
                            Sign out all others ({otherCount})
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {sessionsQuery.isLoading ? (
                        <LoadingState label="Loading sessions…" />
                    ) : sessionsQuery.isError ? (
                        <ErrorState message="Failed to load active sessions." onRetry={() => sessionsQuery.refetch()} />
                    ) : sessions.length === 0 ? (
                        <EmptyState title="No active sessions" hint="Devices signed in to your account will appear here." />
                    ) : (
                        <>
                            <div className="divide-y">
                                {orderedSessions.map((session) => {
                                    const isMobile = /android|ios|mobile/i.test(session.deviceInfo ?? "");
                                    const Icon = isMobile ? DeviceMobile : Desktop;
                                    return (
                                        <div key={session.id} className="flex items-center gap-3 px-4 py-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                                <Icon size={16} weight="bold" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {session.deviceInfo?.trim() ? session.deviceInfo : "Unknown Device"}
                                                </p>
                                                <p
                                                    className="text-xs text-muted-foreground"
                                                    title={`Signed in ${new Date(session.createdAt).toLocaleString()} • expires ${new Date(session.expiresAt).toLocaleString()}`}
                                                >
                                                    Signed in {formatRelativeTime(session.createdAt)} • Expires{" "}
                                                    {formatRelativeTime(session.expiresAt)}
                                                </p>
                                            </div>
                                            {session.isCurrent ? (
                                                <Badge variant="outline" className="font-normal">
                                                    This device
                                                </Badge>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={revokeSession.isPending}
                                                    onClick={() => setConfirm({ kind: "single", session })}
                                                >
                                                    Revoke
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {(sessionsQuery.data?.totalCount ?? 0) > sessions.length && (
                                <div className="border-t px-4 py-2 text-center">
                                    <Button variant="ghost" size="sm" onClick={() => setPageSize((p) => p + 5)}>
                                        Show more sessions
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirm?.kind === "others" ? "Sign out all other devices?" : "Revoke this session?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm?.kind === "others"
                                ? `This signs out ${confirm.count} other device${confirm.count === 1 ? "" : "s"}. Your current session stays active.`
                                : `The device "${confirm?.kind === "single" ? confirm.session.deviceInfo ?? "Unknown Device" : ""}" will be signed out immediately and its refresh token invalidated.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirm(null)}>Keep session</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={confirmPending}
                            onClick={() => {
                                if (!confirm) return;
                                if (confirm.kind === "single") revokeSession.mutate(confirm.session.id);
                                else revokeOthers.mutate();
                                setConfirm(null);
                            }}
                        >
                            {confirmPending ? "Revoking…" : confirm?.kind === "others" ? "Sign out others" : "Revoke session"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
