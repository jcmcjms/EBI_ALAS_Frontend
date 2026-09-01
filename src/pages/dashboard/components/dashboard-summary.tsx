import { ArrowArcLeft, ArrowUpRight, CheckCircle, ClipboardText, TrendUp, UserCircleCheck, WarningCircle } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";
import type { DashboardSummary as DashboardSummaryType } from "../types";

interface DashboardSummaryProps {
    data: DashboardSummaryType;
}

function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
    }
}

export function DashboardSummary({ data }: DashboardSummaryProps) {
    const stats = [
        {
            title: "Total Pending", value: data.totalPending, icon: ClipboardText,
            iconWrap: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400",
            trend: "+4 from yesterday", trendIcon: TrendUp, trendClass: "text-amber-600 dark:text-amber-400", target: "pending-queue",
        },
        {
            title: "Now Serving", value: data.nowServing, icon: UserCircleCheck,
            iconWrap: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400",
            trend: "Active checkers", trendIcon: null, trendClass: "text-muted-foreground", target: "now-serving",
        },
        {
            title: "Push Backs Today", value: data.pushBacksToday, icon: ArrowArcLeft,
            iconWrap: "bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400",
            trend: "Needs attention", trendIcon: WarningCircle, trendClass: "text-red-600 dark:text-red-400", target: "push-back",
        },
        {
            title: "Approved Today", value: data.approvedToday, icon: CheckCircle,
            iconWrap: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400",
            trend: "+12% vs avg", trendIcon: TrendUp, trendClass: "text-emerald-600 dark:text-emerald-400", target: "approved-loans",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <Card
                    key={stat.title}
                    onClick={() => scrollTo(stat.target)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollTo(stat.target); } }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${stat.title}: ${stat.value}. ${stat.trend}`}
                    className="group cursor-pointer scroll-mt-24 transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <div className={cn("rounded-md p-2", stat.iconWrap)}>
                            <stat.icon className="size-5" weight="bold" aria-hidden="true" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
                            <ArrowUpRight size={16} weight="bold" className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                        </div>
                        <p className={cn("mt-1 flex items-center gap-1 text-xs", stat.trendClass)}>
                            {stat.trendIcon && <stat.trendIcon size={12} weight="bold" aria-hidden="true" />}
                            {stat.trend}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
