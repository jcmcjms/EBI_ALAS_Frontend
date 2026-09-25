/**
 * Overview tab — profile card, completeness banner, recent activity,
 * recent applications, and recent clients.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    CalendarBlank,
    CaretRight,
    Envelope,
    IdentificationCard,
    MapPin,
    PencilSimple,
    Phone,
    Sparkle,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { LOAN_STATUS_META } from "@/src/features/loans/utils/loan-status";
import { initialsOf } from "@/src/features/notifications/types";
import { BRANCHES } from "@/src/lib/api/types";
import { cn } from "@/src/shared/lib/utils";
import { useAuthStore } from "@/src/store/authStore";
import {
    useAccountProfile,
    useAccountActivity,
    useAccountLoans,
    useAccountClients,
} from "../hooks/use-account";
import type { AccountTab } from "../types";
import { ActivityTimeline, toTimelineItems } from "./activity-timeline";
import { EmptyState, ErrorState, LoadingState } from "./account-states";

// ─── Component ──────────────────────────────────────────────────────────────

interface OverviewTabProps {
    onEditProfile: () => void;
    onOpenTab: (tab: AccountTab) => void;
}

export function OverviewTab({ onEditProfile, onOpenTab }: OverviewTabProps) {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const profileQuery = useAccountProfile();
    const activityQuery = useAccountActivity(3);
    const loansQuery = useAccountLoans(3);
    const clientsQuery = useAccountClients(5);

    const profile = profileQuery.data;

    // ── Derived data ────────────────────────────────────────────────────────

    const fullName = useMemo(() => {
        if (profile) {
            const middle = profile.middleName ? ` ${profile.middleName}` : "";
            return `${profile.firstName}${middle} ${profile.lastName}`.trim();
        }
        return user ? `${user.firstName} ${user.lastName}`.trim() : "Guest";
    }, [profile, user]);

    const branchLabel = useMemo(() => {
        const code = profile?.branchId ?? user?.branchId;
        if (!code) return null;
        return BRANCHES.find((b) => b.code === code)?.name ?? `Branch ${code}`;
    }, [profile, user]);

    // Photo intentionally excluded: there is no upload endpoint or UI yet,
    // so counting it made 100% unreachable. Re-add when upload ships.
    const missingFields = useMemo(() => {
        if (!profile) return [];
        return [
            !profile.email && "email",
            !profile.phone && "phone number",
            !profile.emergencyContact && "emergency contact",
        ].filter((f): f is string => Boolean(f));
    }, [profile]);

    const stats = useMemo(
        () => [
            { label: "Processed", value: String(profile?.stats.processedLoans ?? 0) },
            { label: "Pending", value: String(profile?.stats.pendingLoans ?? 0) },
            { label: "Approval", value: `${profile?.stats.approvalRate ?? 0}%` },
        ],
        [profile],
    );

    const contactRows = useMemo(() => {
        const rows: { icon: typeof Envelope; text: string; missing: boolean; key: string }[] = [
            {
                key: "email",
                icon: Envelope,
                text: profile?.email ?? "No email on file",
                missing: !profile?.email,
            },
            {
                key: "phone",
                icon: Phone,
                text: profile?.phone ?? "No phone on file",
                missing: !profile?.phone,
            },
            {
                key: "branch",
                icon: MapPin,
                text: branchLabel ?? "No branch assigned",
                missing: !branchLabel,
            },
            {
                key: "employee",
                icon: IdentificationCard,
                text: `Employee ID ${user?.userId ?? profile?.id ?? "—"}`,
                missing: false,
            },
        ];
        if (profile?.createdAt) {
            rows.push({
                key: "joined",
                icon: CalendarBlank,
                text: `Joined ${new Date(profile.createdAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })}`,
                missing: false,
            });
        }
        return rows;
    }, [profile, user, branchLabel]);

    // ── Error state ─────────────────────────────────────────────────────────

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
        );
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Completeness banner */}
            {missingFields.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Sparkle size={16} weight="fill" className="shrink-0 text-primary" />
                        <p className="text-sm text-muted-foreground">
                            Your profile is missing your{" "}
                            <span className="font-medium text-foreground">
                                {missingFields.join(", ")}
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
                {/* ── Profile card ── */}
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
                        {profileQuery.isLoading ? (
                            <LoadingState label="Loading profile…" />
                        ) : (
                            <>
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
                                    <Badge
                                        variant="outline"
                                        className="border-primary/40 text-primary"
                                    >
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
                                            <p className="text-xs text-muted-foreground">
                                                {s.label}
                                            </p>
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
                                                    "min-w-0 flex-1 truncate",
                                                    row.missing &&
                                                        "italic text-muted-foreground",
                                                )}
                                            >
                                                {row.text}
                                            </span>
                                            {row.missing && row.key !== "branch" && (
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

                {/* ── Right column ── */}
                <div className="space-y-6">
                    {/* Latest activity */}
                    <Card>
                        <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
                            <CardTitle className="text-sm">Latest Activity</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenTab("activity")}
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
                        {/* Recent applications */}
                        <Card>
                            <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
                                <CardTitle className="text-sm">Recent Applications</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onOpenTab("my-applications")}
                                >
                                    View all
                                </Button>
                            </CardHeader>
                            <CardContent className="divide-y p-0">
                                {loansQuery.isLoading ? (
                                    <LoadingState label="Loading applications…" />
                                ) : loansQuery.isError ? (
                                    <ErrorState
                                        message="Failed to load your applications."
                                        onRetry={() => loansQuery.refetch()}
                                    />
                                ) : (loansQuery.data ?? []).length === 0 ? (
                                    <EmptyState
                                        title="No applications yet"
                                        hint="Applications you encode will be listed here."
                                        action={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate("/loans/create")}
                                            >
                                                New application
                                            </Button>
                                        }
                                    />
                                ) : (
                                    loansQuery.data!.map((loan) => {
                                        const meta =
                                            LOAN_STATUS_META[
                                                loan.status as keyof typeof LOAN_STATUS_META
                                            ];
                                        return (
                                            <div
                                                key={loan.id}
                                                className="flex items-center gap-3 px-4 py-3"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {loan.lamId}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {loan.clientName}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-xs font-normal",
                                                        meta?.className,
                                                    )}
                                                >
                                                    {meta?.label ?? loan.status}
                                                </Badge>
                                                <span className="text-xs font-semibold tabular-nums">
                                                    ₱{loan.proposedAmount.toLocaleString()}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent clients */}
                        <Card>
                            <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 py-3">
                                <CardTitle className="text-sm">Recent Clients</CardTitle>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    aria-label="Open loan monitoring"
                                    onClick={() => navigate("/loans/monitoring")}
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
    );
}
