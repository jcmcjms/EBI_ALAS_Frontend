import { AppShell } from "@/src/components/layout/AppShell";
import { useAuthStore } from "@/src/store/authStore";

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
    const { data, isLoading, isFetching, dataUpdatedAt } = useDashboardData();

    const asOf = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date();

    return (
        <AppShell>
            <div className="flex flex-1 flex-col gap-6 p-6">
                    {/* Context header */}
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">
                                {greeting()}, {user?.firstName ?? "Officer"}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {asOf.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                                {user?.branchId ? ` • Branch ${user.branchId}` : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs tabular-nums text-muted-foreground">
                                As of {asOf.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isFetching && !isLoading && (
                                <span className="flex items-center gap-1.5 text-xs text-primary">
                                    <span className="h-3 w-3 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                                    Updating…
                                </span>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto" />
                                <p className="mt-4 text-sm text-muted-foreground">Loading dashboard…</p>
                            </div>
                        </div>
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