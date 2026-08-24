import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { pendingQueueData } from "../data/dummy-data";
import type { LoanStatus } from "../types";

const statusStyles: Record<LoanStatus, { className: string; label: string }> = {
    "On Going":            { className: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400", label: "On Going" },
    "For Recommendation":  { className: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400", label: "For Rec" },
    "For Checking":        { className: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400", label: "For Checking" },
    "For Approval":        { className: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400", label: "For Approval" },
    "Approved":            { className: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400", label: "Approved" },
    "Rejected":            { className: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400", label: "Rejected" },
    "Cancelled":           { className: "bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400", label: "Cancelled" },
    "Expired":             { className: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400", label: "Expired" },
    "For Revision":        { className: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400", label: "For Revision" },
    "For Disbursement":    { className: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400", label: "For Disbursement" },
    "Disbursed":           { className: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400", label: "Disbursed" },
};

export function PendingQueue() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    Pending Queue
                    <Badge variant="secondary">{pendingQueueData.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Position</TableHead>
                            <TableHead>LAM ID</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingQueueData.map((item) => (
                            <TableRow key={item.lamId}>
                                <TableCell className="font-medium">#{item.position}</TableCell>
                                <TableCell>{item.lamId}</TableCell>
                                <TableCell>{item.branch}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={statusStyles[item.status]?.className}>
                                        {statusStyles[item.status]?.label || item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{item.date}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}