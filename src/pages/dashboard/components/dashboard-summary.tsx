import {dashboardSummary} from "@/pages/dashboard/data/dummy-data.ts";
import {ArrowArcLeft, CheckCircle, ClipboardText, UserCircleCheck} from "@phosphor-icons/react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";

const stats = [
    {
        title: "Total Pending",
        value: dashboardSummary.totalPending,
        icon: ClipboardText,
        trend: "+4 from yesterday",
        color: "text-blue-500",
        bg: "bg-blue-500/10"
    },
    {
        title: "Now Serving",
        value: dashboardSummary.nowServing,
        icon: UserCircleCheck,
        trend: "8 active checkers",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10"
    },
    {
        title: "Push Backs Today",
        value: dashboardSummary.pushBacksToday,
        icon: ArrowArcLeft,
        trend: "Needs attention",
        color: "text-red-500",
        bg: "bg-red-500/10"
    },
    {
        title: "Approved Today",
        value: dashboardSummary.approvedToday,
        icon: CheckCircle,
        trend: "+12% vs avg",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10"
    }
]

export function DashboardSummary() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <div className={`${stat.bg} rounded-md p-2`}>
                            <stat.icon className={`size-5 ${stat.color}`} weight="bold" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">{stat.trend}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}