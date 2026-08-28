import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    CalendarBlank,
    CaretRight,
    Check,
    CheckCircle,
    ClipboardText,
    Clock,
    Desktop,
    DeviceMobile,
    Envelope,
    FloppyDisk,
    GearSix,
    IdentificationCard,
    Key,
    LockSimple,
    MapPin,
    Phone,
    ShieldCheck,
    SignIn,
} from "@phosphor-icons/react";

import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Spinner } from "@/src/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import {
    useAccountActivity,
    useAccountClients,
    useAccountLoans,
    useAccountProfile,
    useAccountSessions,
    useRevokeSession,
} from "@/src/hooks/useAccount";
import type { Activity, ProcessedLoan, RecentClient, Session } from "@/src/lib/api/account";
import { formatRelativeTime, initialsOf } from "@/src/lib/notifications";
import { cn } from "@/src/lib/utils";
import { useAuthStore } from "@/src/store/authStore";

// ─── Helpers (page-local) ────────────────────────────────────────────────────

type ActivityKind = "application" | "approval" | "security" | "draft" | "login";

const ACTIVITY_META: Record<ActivityKind, { icon: typeof Clock; label: string }> = {
    application: { icon: ClipboardText, label: "Application" },
    approval: { icon: CheckCircle, label: "Approval" },
    security: { icon: LockSimple, label: "Security" },
    draft: { icon: FloppyDisk, label: "Draft" },
    login: { icon: SignIn, label: "Sign-in" },
};

type ApplicationStatus = "released" | "recommended" | "pending" | "returned";

const STATUS_META: Record<ApplicationStatus, { label: string; className: string }> = {
    released: { label: "Released", className: "border-green-300 bg-green-50 text-green-700" },
    recommended: { label: "Recommended", className: "border-blue-300 bg-blue-50 text-blue-700" },
    pending: { label: "Pending", className: "border-amber-300 bg-amber-50 text-amber-700" },
    returned: { label: "Returned", className: "border-red-300 bg-red-50 text-red-700" },
};

function isApplicationStatus(s: string): s is ApplicationStatus {
    return s in STATUS_META;
}

function formatPhp(amount: number): string {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

/** "loan_product.manage" → "Loan Product Manage" */
function permissionLabel(permission: string): string {
    return permission
        .split(/[._]/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

// ─── Activity mapping ────────────────────────────────────────────────────────

interface TimelineItem {
    id: string;
    kind: ActivityKind;
    title: string;
    description: string;
    createdAt: string;
    badge?: string;
    link?: string;
}

/**
 * Map a backend `Activity` record (loan workflow audit log row) into the
 * shape the timeline component renders. Backend Action values are
 * free-form strings (e.g. "Submitted", "Recommended", "Approved"); we bucket
 * them into the five UI kinds.
 */
function toTimelineItem(a: Activity): TimelineItem {
    const action = (a.action ?? "").toLowerCase();
    let kind: ActivityKind = "application";
    if (action.includes("password") || action.includes("login") || action.includes("sign")) {
        kind = action.includes("password") ? "security" : "login";
    } else if (action.includes("draft") || action.includes("saved")) {
        kind = "draft";
    } else if (
        action.includes("recommend") ||
        action.includes("approv") ||
        action.includes("release")
    ) {
        kind = "approval";
    }

    const fromTo = [a.fromStatus, a.toStatus].filter(Boolean).join(" → ");
    const description =
        [a.comments, a.loanClientName ? `Client: ${a.loanClientName}` : null, fromTo || null]
            .filter(Boolean)
            .join(" • ") || a.action;

    return {
        id: String(a.id),
        kind,
        title: `${a.loanFormNumber} — ${a.action}`,
        description,
        createdAt: a.actionDate,
        link: "/loans/monitoring",
    };
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ActivityTimeline({ items }: { items: TimelineItem[] }) {
    return (
        <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border">
            {items.map((item) => {
                const meta = ACTIVITY_META[item.kind];
                const KindIcon = meta.icon;
                return (
                    <li key={item.id} className="relative flex gap-4">
                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
                            <KindIcon size={14} weight="bold" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">{item.title}</p>
                                {item.badge && (
                                    <Badge variant="outline" className="font-normal">
                                        {item.badge}
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock size={12} weight="bold" />
                                {formatRelativeTime(item.createdAt)}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <p>{message}</p>
        </div>
    );
}

function LoadingState({ label = "Loading…" }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            <span>{label}</span>
        </div>
    );
}

function SessionRow({
    session,
    onRevoke,
    isRevoking,
}: {
    session: Session;
    onRevoke: (id: number) => void;
    isRevoking: boolean;
}) {
    const isMobile = /android|ios|mobile/i.test(session.deviceInfo);
    const Icon = isMobile ? DeviceMobile : Desktop;
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon size={16} weight="bold" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{session.deviceInfo}</p>
                <p className="text-xs text-muted-foreground">
                    Signed in {formatRelativeTime(session.createdAt)}
                    {" • "}
                    Expires {formatRelativeTime(session.expiresAt)}
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
                    disabled={isRevoking}
                    onClick={() => onRevoke(session.id)}
                >
                    Revoke
                </Button>
            )}
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function AccountPage() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const [tab, setTab] = useState("overview");

    // ── Data hooks (real backend) ──
    const profileQuery = useAccountProfile();
    const sessionsQuery = useAccountSessions(1, 10);
    const activityQuery = useAccountActivity(10);
    const loansQuery = useAccountLoans(5);
    const clientsQuery = useAccountClients(5);
    const revokeSession = useRevokeSession();

    const profile = profileQuery.data;
    const sessions = sessionsQuery.data?.items ?? [];
    const loans = loansQuery.data ?? [];
    const clients = clientsQuery.data ?? [];

    // ── Derived data ──
    const timelineItems = useMemo<TimelineItem[]>(
        () => (activityQuery.data ?? []).map((a) => toTimelineItem(a)),
        [activityQuery.data],
    );

    const fullName = useMemo(() => {
        if (profile) {
            const middle = profile.middleName ? ` ${profile.middleName}` : "";
            return `${profile.firstName}${middle} ${profile.lastName}`.trim();
        }
        if (user) return `${user.firstName} ${user.lastName}`.trim();
        return "Guest";
    }, [profile, user]);

    const branchLabel = useMemo(() => {
        const code = profile?.branchId ?? user?.branchId;
        if (!code) return null;
        return `Branch ${code}`;
    }, [profile, user]);

    const completeness = useMemo(() => {
        const fields: { label: string; present: boolean }[] = [
            { label: "email", present: !!profile?.email },
            { label: "branch assignment", present: !!profile?.branchId },
            { label: "phone number", present: !!profile?.phone },
            { label: "emergency contact", present: !!profile?.emergencyContact },
            { label: "profile photo", present: !!profile?.profilePhotoUrl },
        ];
        const missing = fields.filter((f) => !f.present).map((f) => f.label);
        const pct = Math.round(((fields.length - missing.length) / fields.length) * 100);
        return { pct, missing };
    }, [profile]);

    const stats = useMemo(
        () => [
            { label: "Processed", value: String(profile?.stats.processedLoans ?? 0) },
            { label: "Pending", value: String(profile?.stats.pendingLoans ?? 0) },
            {
                label: "Approval",
                value: `${profile?.stats.approvalRate ?? 0}%`,
            },
        ],
        [profile],
    );

    const permissionGroups = useMemo(() => {
        const permissions = user?.permissions ?? [];
        const groups = new Map<string, string[]>();
        for (const p of permissions) {
            if (p === "*") continue;
            const [module, ...rest] = p.split(".");
            const key = permissionLabel(module ?? p);
            const list = groups.get(key) ?? [];
            list.push(permissionLabel(rest.join(".") || "view"));
            groups.set(key, list);
        }
        return [...groups.entries()];
    }, [user]);

    const contactRows = useMemo(() => {
        if (!profile && !user) return [];
        return [
            { icon: Envelope, text: profile?.email ?? "No email on file", muted: !profile?.email },
            {
                icon: Phone,
                text: profile?.phone ?? "No phone on file",
                muted: !profile?.phone,
            },
            { icon: MapPin, text: branchLabel ?? "No branch assigned", muted: !branchLabel },
            {
                icon: IdentificationCard,
                text: `Employee ID ${user?.userId ?? profile?.id ?? "—"}`,
                muted: !user?.userId && !profile?.id,
            },
            {
                icon: CalendarBlank,
                text: profile?.createdAt
                    ? `Joined ${new Date(profile.createdAt).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                      })}`
                    : null,
                muted: !profile?.createdAt,
            },
        ].filter((r) => r.text !== null) as Array<{
            icon: typeof Envelope;
            text: string;
            muted?: boolean;
        }>;
    }, [profile, user, branchLabel]);

    const handleRevoke = (sessionId: number) => {
        revokeSession.mutate(sessionId, {
            onSuccess: () => {
                toast.success("Session revoked successfully");
            },
            onError: (err: unknown) => {
                const message =
                    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                    "Failed to revoke session";
                toast.error(message);
            },
        });
    };

    const profileError = profileQuery.error;

    return (
        <div className="flex flex-1 flex-col bg-muted/40">
            <div className="container mx-auto w-full max-w-7xl flex-1 px-6 py-8">
                {/* Page header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">My Account</h1>
                    <Button className="gap-2" onClick={() => setTab("security")}>
                        <GearSix size={16} weight="bold" />
                        Settings
                    </Button>
                </div>

                {profileError ? (
                    <Card className="mt-6 border-destructive/40 bg-destructive/5">
                        <CardContent className="py-4 text-sm text-destructive">
                            Failed to load account profile. Please refresh the page or try again.
                        </CardContent>
                    </Card>
                ) : null}

                <Tabs value={tab} onValueChange={(v) => v && setTab(v)} className="mt-6">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                        <TabsTrigger value="permissions">Permissions</TabsTrigger>
                    </TabsList>

                    {/* ── Overview ─────────────────────────────────────── */}
                    <TabsContent value="overview">
                        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                            {/* Left column */}
                            <div className="space-y-6">
                                <Card>
                                    <CardContent className="flex flex-col items-center pt-8 text-center">
                                        <Avatar className="h-24 w-24">
                                            {profile?.profilePhotoUrl ? (
                                                <img
                                                    src={profile.profilePhotoUrl}
                                                    alt={fullName}
                                                    className="h-full w-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <AvatarFallback className="text-2xl">
                                                    {initialsOf(fullName)}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div className="mt-4 flex items-center gap-2">
                                            <h2 className="text-xl font-semibold">{fullName}</h2>
                                            <Badge variant="outline" className="border-primary/40 text-primary">
                                                {user?.role ?? profile?.role ?? "—"}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {branchLabel ?? "—"}
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
                                                    key={row.text}
                                                    className="flex items-center gap-3 text-sm"
                                                >
                                                    <row.icon
                                                        size={16}
                                                        weight="bold"
                                                        className="shrink-0 text-muted-foreground"
                                                    />
                                                    <span
                                                        className={cn(
                                                            "truncate",
                                                            row.muted && "italic text-muted-foreground",
                                                        )}
                                                    >
                                                        {row.text}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="border-b bg-muted/30 py-3">
                                        <CardTitle className="text-sm">Complete Your Profile</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-1.5 flex-1 rounded-full bg-muted"
                                                role="progressbar"
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-valuenow={completeness.pct}
                                                aria-label="Profile completeness"
                                            >
                                                <div
                                                    className="h-full rounded-full bg-primary"
                                                    style={{ width: `${completeness.pct}%` }}
                                                />
                                            </div>
                                            <span className="text-xs tabular-nums text-muted-foreground">
                                                {completeness.pct}%
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {completeness.missing.length > 0
                                                ? `Add your ${completeness.missing.join(", ")} to reach 100%.`
                                                : "Your profile is complete."}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="border-b bg-muted/30 py-3">
                                        <CardTitle className="text-sm">Module Access</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-wrap gap-2 pt-4">
                                        {(user?.permissions ?? []).includes("*") ? (
                                            <Badge variant="outline" className="gap-1.5 font-normal">
                                                <ShieldCheck size={12} weight="bold" /> Super Admin — full access
                                            </Badge>
                                        ) : (user?.permissions ?? []).length === 0 ? (
                                            <p className="text-xs text-muted-foreground">
                                                No module permissions assigned.
                                            </p>
                                        ) : (
                                            (user?.permissions ?? []).slice(0, 8).map((p) => (
                                                <Badge key={p} variant="outline" className="font-normal">
                                                    {permissionLabel(p)}
                                                </Badge>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right column */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
                                        <CardTitle className="text-sm">Latest Activity</CardTitle>
                                        <Button variant="ghost" size="sm" onClick={() => setTab("activity")}>
                                            View All
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {activityQuery.isLoading ? (
                                            <LoadingState label="Loading activity…" />
                                        ) : timelineItems.length === 0 ? (
                                            <EmptyState message="No recent activity yet." />
                                        ) : (
                                            <ActivityTimeline items={timelineItems.slice(0, 3)} />
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="grid gap-6 xl:grid-cols-2">
                                    <Card>
                                        <CardHeader className="border-b bg-muted/30 py-3">
                                            <CardTitle className="text-sm">Processed Applications</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {loansQuery.isLoading ? (
                                                <LoadingState label="Loading applications…" />
                                            ) : loans.length === 0 ? (
                                                <EmptyState message="No processed applications yet." />
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Application</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right">Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {loans.map((app: ProcessedLoan) => {
                                                            const status = app.status;
                                                            const meta = isApplicationStatus(status)
                                                                ? STATUS_META[status]
                                                                : {
                                                                      label: status,
                                                                      className:
                                                                          "border-slate-300 bg-slate-50 text-slate-700",
                                                                  };
                                                            return (
                                                                <TableRow key={app.id}>
                                                                    <TableCell>
                                                                        <p className="font-mono text-xs font-medium">
                                                                            {app.formNumber}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {app.clientName} •{" "}
                                                                            {new Date(
                                                                                app.applicationDate,
                                                                            ).toLocaleDateString("en-PH", {
                                                                                month: "short",
                                                                                day: "numeric",
                                                                            })}
                                                                        </p>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={cn(
                                                                                "font-normal",
                                                                                meta.className,
                                                                            )}
                                                                        >
                                                                            {meta.label}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-sm tabular-nums">
                                                                        {formatPhp(app.proposedAmount)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
                                            <CardTitle className="text-sm">Recent Clients</CardTitle>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                aria-label="View all clients"
                                                onClick={() => navigate("/loans/monitoring")}
                                            >
                                                <CaretRight size={14} weight="bold" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="divide-y p-0">
                                            {clientsQuery.isLoading ? (
                                                <LoadingState label="Loading clients…" />
                                            ) : clients.length === 0 ? (
                                                <EmptyState message="No recent clients yet." />
                                            ) : (
                                                clients.map((client: RecentClient) => (
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
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => navigate("/loans/monitoring")}
                                                        >
                                                            View
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── Security ────────────────────────────────────── */}
                    <TabsContent value="security">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader className="border-b bg-muted/30 py-3">
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <Key size={14} weight="bold" className="text-primary" /> Password
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        {profile?.passwordChangedAt
                                            ? `Last changed ${formatRelativeTime(profile.passwordChangedAt)}.`
                                            : "No password change recorded yet."}{" "}
                                        Policy: 90-day rotation, 8+ chars with upper, lower, digit and symbol.
                                    </p>
                                    <Button className="gap-2" onClick={() => navigate("/change-password")}>
                                        Change Password
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="border-b bg-muted/30 py-3">
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <ShieldCheck
                                            size={14}
                                            weight="bold"
                                            className="text-primary"
                                        />{" "}
                                        Two-Factor Authentication
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className="border-amber-300 bg-amber-50 font-normal text-amber-700"
                                        >
                                            Not enrolled
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Add a second factor (TOTP authenticator app) to protect officer accounts.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => toast.info("MFA enrollment opens once the API is wired.")}
                                    >
                                        Enroll
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-2">
                                <CardHeader className="border-b bg-muted/30 py-3">
                                    <CardTitle className="text-sm">Active Sessions</CardTitle>
                                </CardHeader>
                                <CardContent className="divide-y p-0">
                                    {sessionsQuery.isLoading ? (
                                        <LoadingState label="Loading sessions…" />
                                    ) : sessionsQuery.isError ? (
                                        <EmptyState message="Failed to load active sessions." />
                                    ) : sessions.length === 0 ? (
                                        <EmptyState message="No active sessions." />
                                    ) : (
                                        sessions.map((session: Session) => (
                                            <SessionRow
                                                key={session.id}
                                                session={session}
                                                onRevoke={handleRevoke}
                                                isRevoking={
                                                    revokeSession.isPending &&
                                                    revokeSession.variables === session.id
                                                }
                                            />
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ── Activity ────────────────────────────────────── */}
                    <TabsContent value="activity">
                        <Card>
                            <CardHeader className="border-b bg-muted/30 py-3">
                                <CardTitle className="text-sm">Activity History</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {activityQuery.isLoading ? (
                                    <LoadingState label="Loading activity…" />
                                ) : timelineItems.length === 0 ? (
                                    <EmptyState message="No activity recorded yet." />
                                ) : (
                                    <ActivityTimeline items={timelineItems} />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Permissions ──────────────────────────────────── */}
                    <TabsContent value="permissions">
                        <Card>
                            <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
                                <CardTitle className="text-sm">Role & Permissions</CardTitle>
                                <Badge variant="outline" className="border-primary/40 text-primary">
                                    {user?.role ?? profile?.role ?? "—"}
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                {(user?.permissions ?? []).includes("*") ? (
                                    <p className="text-sm text-muted-foreground">
                                        Super Admin — unrestricted access to all modules.
                                    </p>
                                ) : permissionGroups.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No granular permissions assigned to this role.
                                    </p>
                                ) : (
                                    permissionGroups.map(([module, actions]) => (
                                        <div key={module}>
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {module}
                                            </h3>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {actions.map((action) => (
                                                    <Badge
                                                        key={action}
                                                        variant="outline"
                                                        className="gap-1.5 font-normal"
                                                    >
                                                        <Check size={12} weight="bold" /> {action}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Permissions are managed by the System Administrator under
                                    Administration → Roles & Permissions.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
