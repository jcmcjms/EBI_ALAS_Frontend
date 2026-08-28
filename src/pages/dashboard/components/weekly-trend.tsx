import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import type { WeeklyTrendPoint } from "../types";

interface WeeklyTrendProps {
    data: WeeklyTrendPoint[];
}

/** Dependency-free mini bar chart (approved vs push backs, last 7 days). */
export function WeeklyTrend({ data }: WeeklyTrendProps) {
    const max = Math.max(1, ...data.map((d) => Math.max(d.approved, d.pushBacks)));
    const totalApproved = data.reduce((n, d) => n + d.approved, 0);
    const totalPushBacks = data.reduce((n, d) => n + d.pushBacks, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">7-Day Trend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex h-28 items-end gap-2" role="img" aria-label={`Approved vs push backs, last 7 days`}>
                    {data.map((d) => (
                        <div key={d.day} className="flex h-full flex-1 items-end justify-center gap-1">
                            <div
                                title={`${d.approved} approved`}
                                className="w-2.5 rounded-sm bg-emerald-500/70 transition-colors hover:bg-emerald-500"
                                style={{ height: `${(d.approved / max) * 100}%` }}
                            />
                            <div
                                title={`${d.pushBacks} push backs`}
                                className="w-2.5 rounded-sm bg-red-400/70 transition-colors hover:bg-red-400"
                                style={{ height: `${(d.pushBacks / max) * 100}%` }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                    {data.map((d) => (
                        <span key={d.day} className="flex-1 text-center">{d.day}</span>
                    ))}
                </div>
                <div className="flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm bg-emerald-500/70" aria-hidden />
                        Approved <span className="font-medium tabular-nums text-foreground">{totalApproved}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm bg-red-400/70" aria-hidden />
                        Push backs <span className="font-medium tabular-nums text-foreground">{totalPushBacks}</span>
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}