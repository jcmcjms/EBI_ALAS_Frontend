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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import {
    ACCOUNT_STATS,
    ACTIVITY_ITEMS,
    ACTIVE_SESSIONS,
    PROCESSED_APPLICATIONS,
    PROFILE_DETAILS,
    RECENT_CLIENTS,
    formatPhp,
    permissionLabel,
    type ActivityItem,
    type ActivityKind,
    type ApplicationStatus,
} from "./account-data";
import { formatRelativeTime, initialsOf } from "@/src/lib/notifications";
import { cn } from "@/src/lib/utils";
import { useAuthStore } from "@/src/store/authStore";

const ACTIVITY_META: Record<ActivityKind, { icon: typeof Clock; label: string }> = {
    application: { icon: ClipboardText, label: "Application" },
    approval: { icon: CheckCircle, label: "Approval" },
    security: { icon: LockSimple, label: "Security" },
    draft: { icon: FloppyDisk, label: "Draft" },
    login: { icon: SignIn, label: "Sign-in" },
};

const STATUS_META: Record<ApplicationStatus, { label: string; className: string }> = {
    released: { label: "Released", className: "border-green-300 bg-green-50 text-green-700" },
    recommended: { label: "Recommended", className: "border-blue-300 bg-blue-50 text-blue-700" },
    pending: { label: "Pending", className: "border-amber-300 bg-amber-50 text-amber-700" },
    returned: { label: "Returned", className: "border-red-300 bg-red-50 text-red-700" },
};

function ActivityTimeline({ items }: { items: ActivityItem[] }) {
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
                                {item.badge && <Badge variant="outline" className="font-normal">{item.badge}</Badge>}
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

export function AccountPage() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const [tab, setTab] = useState("overview");

    const fullName = user ? `${user.firstName} ${user.lastName}` : "Guest";

    const completeness = useMemo(() => {
        const fields: { label: string; present: boolean }[] = [
            { label: "email", present: !!PROFILE_DETAILS.email },
            { label: "branch assignment", present: !!PROFILE_DETAILS.location },
            { label: "phone number", present: !!PROFILE_DETAILS.phone },
            { label: "emergency contact", present: !!PROFILE_DETAILS.emergencyContact },
            { label: "profile photo", present: !!PROFILE_DETAILS.photo },
        ];
        const missing = fields.filter((f) => !f.present).map((f) => f.label);
        const pct = Math.round(((fields.length - missing.length) / fields.length) * 100);
        return { pct, missing };
    }, []);

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

    const contactRows = [
        { icon: Envelope, text: PROFILE_DETAILS.email },
        { icon: Phone, text: PROFILE_DETAILS.phone ?? "No phone on file", muted: !PROFILE_DETAILS.phone },
        { icon: MapPin, text: PROFILE_DETAILS.location },
        { icon: IdentificationCard, text: `Employee ID ${user?.userId ?? "—"}` },
        {
            icon: CalendarBlank,
            text: `Joined ${new Date(PROFILE_DETAILS.joinedDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`,
        },
    ];

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
                                            <AvatarFallback className="text-2xl">{initialsOf(fullName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="mt-4 flex items-center gap-2">
                                            <h2 className="text-xl font-semibold">{fullName}</h2>
                                            <Badge variant="outline" className="border-primary/40 text-primary">
                                                {user?.role ?? "—"}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">{PROFILE_DETAILS.location}</p>

                                        <div className="mt-6 grid w-full grid-cols-3 divide-x rounded-md border bg-muted/30">
                                            {ACCOUNT_STATS.map((s) => (
                                                <div key={s.label} className="px-2 py-3">
                                                    <p className="text-lg font-semibold tabular-nums">{s.value}</p>
                                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <ul className="mt-6 w-full space-y-3 text-left">
                                            {contactRows.map((row) => (
                                                <li key={row.text} className="flex items-center gap-3 text-sm">
                                                    <row.icon size={16} weight="bold" className="shrink-0 text-muted-foreground" />
                                                    <span className={cn("truncate", row.muted && "italic text-muted-foreground")}>{row.text}</span>
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
                                                <div className="h-full rounded-full bg-primary" style={{ width: `${completeness.pct}%` }} />
                                            </div>
                                            <span className="text-xs tabular-nums text-muted-foreground">{completeness.pct}%</span>
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
                                        <ActivityTimeline items={ACTIVITY_ITEMS.slice(0, 3)} />
                                    </CardContent>
                                </Card>

                                <div className="grid gap-6 xl:grid-cols-2">
                                    <Card>
                                        <CardHeader className="border-b bg-muted/30 py-3">
                                            <CardTitle className="text-sm">Processed Applications</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Application</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="text-right">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {PROCESSED_APPLICATIONS.map((app) => (
                                                        <TableRow key={app.id}>
                                                            <TableCell>
                                                                <p className="font-mono text-xs font-medium">{app.id}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {app.client} • {new Date(app.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={cn("font-normal", STATUS_META[app.status].className)}>
                                                                    {STATUS_META[app.status].label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm tabular-nums">
                                                                {formatPhp(app.amount)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
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
                                            {RECENT_CLIENTS.map((client) => (
                                                <div key={client.cisId} className="flex items-center gap-3 px-4 py-3">
                                                    <Avatar>
                                                        <AvatarFallback>{initialsOf(client.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">{client.name}</p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            CIS {client.cisId} • {client.agency}
                                                        </p>
                                                    </div>
                                                    <Button variant="outline" size="sm" onClick={() => navigate("/loans/monitoring")}>
                                                        View
                                                    </Button>
                                                </div>
                                            ))}
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
                                        Last changed {formatRelativeTime(ACTIVITY_ITEMS.find((a) => a.kind === "security")?.createdAt ?? new Date().toISOString())}.
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
                                        <ShieldCheck size={14} weight="bold" className="text-primary" /> Two-Factor Authentication
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="border-amber-300 bg-amber-50 font-normal text-amber-700">
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
                                    {ACTIVE_SESSIONS.map((session) => (
                                        <div key={session.id} className="flex items-center gap-3 px-4 py-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                                {session.device.startsWith("Android") ? (
                                                    <DeviceMobile size={16} weight="bold" />
                                                ) : (
                                                    <Desktop size={16} weight="bold" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium">{session.device}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {session.detail} • {session.current ? "Active now" : `Last active ${formatRelativeTime(session.lastActive)}`}
                                                </p>
                                            </div>
                                            {session.current ? (
                                                <Badge variant="outline" className="font-normal">This device</Badge>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toast.success("Session revoked. TODO(api): DELETE /api/auth/sessions/{id}")}
                                                >
                                                    Revoke
                                                </Button>
                                            )}
                                        </div>
                                    ))}
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
                                <ActivityTimeline items={ACTIVITY_ITEMS} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Permissions ──────────────────────────────────── */}
                    <TabsContent value="permissions">
                        <Card>
                            <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
                                <CardTitle className="text-sm">Role & Permissions</CardTitle>
                                <Badge variant="outline" className="border-primary/40 text-primary">{user?.role ?? "—"}</Badge>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                {(user?.permissions ?? []).includes("*") ? (
                                    <p className="text-sm text-muted-foreground">
                                        Super Admin — unrestricted access to all modules.
                                    </p>
                                ) : (
                                    permissionGroups.map(([module, actions]) => (
                                        <div key={module}>
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{module}</h3>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {actions.map((action) => (
                                                    <Badge key={action} variant="outline" className="gap-1.5 font-normal">
                                                        <Check size={12} weight="bold" /> {action}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Permissions are managed by the System Administrator under Administration → Roles & Permissions.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}