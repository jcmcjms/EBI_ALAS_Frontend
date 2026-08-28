import { useNavigate } from "react-router-dom";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
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

interface PendingQueueProps {
    data: PendingQueueItem[];
}

export function PendingQueue({ data }: PendingQueueProps) {
    const navigate = useNavigate();

    return (
        <Card id="pending-queue" className="scroll-mt-24">
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                    Pending Queue
                    <Badge variant="secondary" className="tabular-nums">{data.length}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/loans/monitoring")}>
                    View all
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[70px]">Position</TableHead>
                            <TableHead>LAM ID</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Waiting</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                    Queue is clear — no pending applications.
                                </TableCell>
                            </TableRow>
                        )}
                        {data.map((item) => {
                            const mins = waitingMinutes(item.date);
                            return (
                                <TableRow
                                    key={item.lamId}
                                    onClick={() => navigate("/loans/monitoring")}
                                    className={cn("cursor-pointer", item.position === 1 && "bg-primary/[0.04]")}
                                >
                                    <TableCell className="font-medium tabular-nums">#{item.position}</TableCell>
                                    <TableCell className="font-mono text-xs">{item.lamId}</TableCell>
                                    <TableCell>{item.branch}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("font-normal", statusStyles[item.status])}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="text-xs tabular-nums text-muted-foreground">{formatWaiting(mins)}</span>
                                        {mins >= 120 && (
                                            <Badge variant="outline" className="ml-2 border-red-300 bg-red-50 text-red-700">
                                                Aging
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}