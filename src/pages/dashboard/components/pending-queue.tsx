import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";
import type { PendingQueueItem, LoanStatus } from "../types";

const statusStyles: Record<LoanStatus, string> = {
    "On Going": "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    "For Recommendation": "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    "For Checking": "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
    "For Approval": "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
    "Approved": "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    "Rejected": "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    "Cancelled": "bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
    "Expired": "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    "For Revision": "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    "For Disbursement": "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
    "Disbursed": "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
};

function waitingMinutes(date: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
}

function formatWaiting(mins: number): string {
    const h = Math.floor(mins / 60);
    return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

interface PendingQueueProps { data: PendingQueueItem[]; }

export function PendingQueue({ data }: PendingQueueProps) {
    const navigate = useNavigate();
    const displayData = useMemo(() => data.slice(0, 5), [data]);

    return (
        <Card id="pending-queue" className="scroll-mt-24 flex flex-col">
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                    Pending Queue
                    {data.length > 0 && <Badge variant="secondary" className="tabular-nums">{data.length}</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-sm text-muted-foreground mb-4">Queue is clear — no pending applications.</p>
                        <Button variant="outline" size="sm" onClick={() => navigate("/loans/create")}>Create New Loan</Button>
                    </div>
                ) : (
                    <ul className="divide-y">
                        {displayData.map((item) => {
                            const mins = waitingMinutes(item.date);
                            return (
                                <li
                                    key={item.lamId}
                                    onClick={() => navigate("/loans/monitoring")}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/loans/monitoring"); } }}
                                    tabIndex={0}
                                    role="link"
                                    className={cn("flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", item.position === 1 && "bg-primary/[0.04]")}
                                >
                                    <span className="w-8 text-center text-sm font-semibold tabular-nums text-muted-foreground">#{item.position}</span>
                                    <Avatar size="sm" className="border"><AvatarFallback>{item.lamId.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium truncate">{item.lamId}</p>
                                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-normal", statusStyles[item.status])}>{item.status}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{item.branch}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-sm font-medium tabular-nums">{formatWaiting(mins)}</span>
                                        {mins >= 120 && <Badge variant="outline" className="ml-2 border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 text-[10px] h-4 px-1.5">Aging</Badge>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
            {data.length > 5 && (
                <CardFooter className="border-t p-3 justify-center">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/loans/monitoring")} className="w-full text-sm">View all {data.length} pending loans</Button>
                </CardFooter>
            )}
        </Card>
    );
}
