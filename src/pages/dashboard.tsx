import { AppShell } from "@/src/components/layout/AppShell";
import { useAuthStore } from "@/src/store/authStore";
import { useNavigate } from "react-router-dom";
import { BRANCHES } from "@/src/lib/api/types";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";

import { ApprovedLoans } from "@/src/pages/dashboard/components/approved-loans";
import { DashboardSummary } from "@/src/pages/dashboard/components/dashboard-summary";
import { NowServing } from "@/src/pages/dashboard/components/now-serving";
import { PendingQueue } from "@/src/pages/dashboard/components/pending-queue";
import { PushBack } from "@/src/pages/dashboard/components/push-back";
import { WeeklyTrend } from "@/src/pages/dashboard/components/weekly-trend";
import { useDashboardData } from "@/src/hooks/useDashboardData";

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
}

export function Dashboard() {
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    const { data, isLoading, dataUpdatedAt } = useDashboardData();

    const asOf = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date();

    return (
        <AppShell>
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">
                            {greeting()}, {user?.firstName ?? "Officer"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {asOf.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                            {user?.branchId ? ` • ${BRANCHES.find(b => b.code === user.branchId)?.name ?? `Branch ${user.branchId}`}` : ""}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground mr-2">
                            As of {asOf.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <Button size="sm" onClick={() => navigate("/loans/create")}>
                            <Plus size={16} weight="bold" className="mr-1" />
                            New Loan
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <DashboardSkeleton />
                ) : data ? (
                    <>
                        <DashboardSummary data={data.summary} />

                        <div className="grid gap-6 xl:grid-cols-3">
                            <div className="xl:col-span-2">
                                <PendingQueue data={data.pendingQueue} />
                            </div>
                            <div className="flex flex-col gap-6">
                                <NowServing data={data.nowServing} />
                                <WeeklyTrend data={data.weeklyTrend} />
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <PushBack data={data.pushBacks} />
                            <ApprovedLoans data={data.approvedLoans} />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-64 text-center">
                        <p className="text-sm text-muted-foreground">Failed to load dashboard data.</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}

function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
                <Skeleton className="h-80 xl:col-span-2 w-full rounded-lg" />
                <div className="flex flex-col gap-6">
                    <Skeleton className="h-56 w-full rounded-lg" />
                    <Skeleton className="h-56 w-full rounded-lg" />
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-80 w-full rounded-lg" />
                <Skeleton className="h-80 w-full rounded-lg" />
            </div>
        </div>
    );
}
