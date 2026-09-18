import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { useAccountLoans } from "@/src/hooks/useAccount";
import { LOAN_STATUS_META, type LoanStatus } from "@/src/lib/loan-status";
import { cn } from "@/src/lib/utils";
import { useAuthStore } from "@/src/store/authStore";
import { EmptyState, ErrorState, LoadingState } from "./account-states";

/**
 * Full list of the current user's applications. Shares the `account-loans`
 * cache family with the Overview preview — no duplicate fetch on tab switch.
 */
export function MyApplicationsTab() {
    const navigate = useNavigate();
    const hasCreatePermission = useAuthStore((s) => s.hasPermission("loans.create"));
    const { data, isLoading, isError, refetch } = useAccountLoans(200);

    if (isLoading) return <LoadingState label="Loading your applications…" />;
    if (isError) return <ErrorState message="Failed to load your applications." onRetry={() => refetch()} />;
    if (!data || data.length === 0) {
        return (
            <EmptyState
                title="No applications yet"
                hint="Loan applications you encode will appear here with their current status."
                action={
                    hasCreatePermission ? (
                        <Button variant="outline" size="sm" onClick={() => navigate("/loans/create")}>
                            New application
                        </Button>
                    ) : undefined
                }
            />
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>LAM ID</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied On</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((app) => {
                    const meta = LOAN_STATUS_META[app.status as LoanStatus];
                    return (
                        <TableRow key={app.id}>
                            <TableCell className="text-xs font-semibold">{app.lamId}</TableCell>
                            <TableCell>{app.clientName}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={cn("text-xs font-normal", meta?.className)}>
                                    {meta?.label ?? app.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(app.applicationDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                                ₱{app.proposedAmount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/loans/monitoring?id=${app.id}`)}
                                >
                                    View details
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
