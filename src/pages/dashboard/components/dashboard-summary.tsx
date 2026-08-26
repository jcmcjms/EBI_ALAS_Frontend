import {ArrowArcLeft, CheckCircle, ClipboardText, UserCircleCheck} from "@phosphor-icons/react";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card.tsx";
import {useDashboardSummary} from "@/src/hooks/use-dashboard";
import {Spinner} from "@/src/components/ui/spinner";

export function DashboardSummary() {
    const { data: summary, isLoading, error } = useDashboardSummary();

    const stats = [
        {
            title: "Total Pending",
            value: summary?.totalPending ?? 0,
            icon: ClipboardText,
            trend: "+4 from yesterday",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Now Serving",
            value: summary?.nowServing ?? 0,
            icon: UserCircleCheck,
            trend: "8 active checkers",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            title: "Push Backs Today",
            value: summary?.pushBacksToday ?? 0,
            icon: ArrowArcLeft,
            trend: "Needs attention",
            color: "text-red-500",
            bg: "bg-red-500/10"
        },
        {
            title: "Approved Today",
            value: summary?.approvedToday ?? 0,
            icon: CheckCircle,
            trend: "+12% vs avg",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        }
    ]

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardContent className="flex items-center justify-center py-8">
                            <Spinner className="size-5" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
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
                            <p className="text-xs text-muted-foreground">Unable to load data</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }
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