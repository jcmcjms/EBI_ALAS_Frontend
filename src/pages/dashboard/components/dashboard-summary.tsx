import {
    ArrowArcLeft,
    ArrowUpRight,
    CheckCircle,
    ClipboardText,
    TrendUp,
    UserCircleCheck,
    WarningCircle,
} from "@phosphor-icons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";
import type { DashboardSummary as DashboardSummaryType } from "../types";

interface DashboardSummaryProps {
    data: DashboardSummaryType;
}

function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function DashboardSummary({ data }: DashboardSummaryProps) {
    const stats = [
        {
            title: "Total Pending",
            value: data.totalPending,
            icon: ClipboardText,
            iconWrap: "bg-blue-500/10 text-blue-500",
            trend: "+4 from yesterday",
            trendIcon: TrendUp,
            trendClass: "text-amber-600",
            target: "pending-queue",
        },
        {
            title: "Now Serving",
            value: data.nowServing,
            icon: UserCircleCheck,
            iconWrap: "bg-emerald-500/10 text-emerald-500",
            trend: "8 active checkers",
            trendIcon: null,
            trendClass: "text-muted-foreground",
            target: "now-serving",
        },
        {
            title: "Push Backs Today",
            value: data.pushBacksToday,
            icon: ArrowArcLeft,
            iconWrap: "bg-red-500/10 text-red-500",
            trend: "Needs attention",
            trendIcon: WarningCircle,
            trendClass: "text-red-600",
            target: "push-back",
        },
        {
            title: "Approved Today",
            value: data.approvedToday,
            icon: CheckCircle,
            iconWrap: "bg-emerald-500/10 text-emerald-500",
            trend: "+12% vs avg",
            trendIcon: TrendUp,
            trendClass: "text-emerald-600",
            target: "approved-loans",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <Card
                    key={stat.title}
                    onClick={() => scrollTo(stat.target)}
                    className="group cursor-pointer scroll-mt-24 transition-colors hover:border-primary/40"
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <div className="flex items-center gap-1">
                            <div className={cn("rounded-md p-2", stat.iconWrap)}>
                                <stat.icon className="size-5" weight="bold" />
                            </div>
                            <ArrowUpRight
                                size={14}
                                weight="bold"
                                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
                        <p className={cn("mt-0.5 flex items-center gap-1 text-xs", stat.trendClass)}>
                            {stat.trendIcon && <stat.trendIcon size={12} weight="bold" />}
                            {stat.trend}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}