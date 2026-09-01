import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import type { WeeklyTrendPoint } from "../types";

interface WeeklyTrendProps { data: WeeklyTrendPoint[]; }

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">Day</span>
                        <span className="font-bold text-muted-foreground">{label}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-emerald-500">Approved</span>
                        <span className="font-bold text-emerald-500">{payload[0].value}</span>
                    </div>
                    <div className="flex flex-col col-span-2">
                        <span className="text-[0.70rem] uppercase text-red-500">Push Backs</span>
                        <span className="font-bold text-red-500">{payload[1]?.value || 0}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export function WeeklyTrend({ data }: WeeklyTrendProps) {
    const totalApproved = useMemo(() => data.reduce((n, d) => n + d.approved, 0), [data]);
    const totalPushBacks = useMemo(() => data.reduce((n, d) => n + d.pushBacks, 0), [data]);

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">7-Day Trend</CardTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-emerald-500" aria-hidden />
                        Approved <span className="font-medium tabular-nums text-foreground">{totalApproved}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-red-400" aria-hidden />
                        Push backs <span className="font-medium tabular-nums text-foreground">{totalPushBacks}</span>
                    </span>
                </div>
            </CardHeader>
            <CardContent className="mt-2 flex-1">
                {data.length === 0 ? (
                    <div className="h-40 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">No trend data available.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)" }} />
                            <Bar dataKey="approved" fill="#10b981" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                            <Bar dataKey="pushBacks" fill="#f87171" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
