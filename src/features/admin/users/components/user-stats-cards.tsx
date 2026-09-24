/**
 * User stats cards — total, active, suspended counts.
 */

import { Card } from "@/src/components/ui/card";

interface UserStatsCardsProps {
    totalCount: number;
    activeCount: number;
    suspendedCount: number;
}

export function UserStatsCards({
    totalCount,
    activeCount,
    suspendedCount,
}: UserStatsCardsProps) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <Card className="flex items-center justify-between border p-3 shadow-none">
                <div className="text-sm text-muted-foreground">Total Users</div>
                <div className="text-xl font-bold">{totalCount}</div>
            </Card>
            <Card className="flex items-center justify-between border p-3 shadow-none">
                <div className="text-sm text-muted-foreground">Active</div>
                <div className="text-xl font-bold text-emerald-600">{activeCount}</div>
            </Card>
            <Card className="flex items-center justify-between border p-3 shadow-none">
                <div className="text-sm text-muted-foreground">Suspended</div>
                <div className="text-xl font-bold text-red-600">{suspendedCount}</div>
            </Card>
        </div>
    );
}
