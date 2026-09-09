import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAccountLoans } from "@/src/hooks/useAccount";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table";

/**
 * "My Applications" tab on the Account page. Backed by the existing
 * `useAccountLoans` hook (no new fetch) so the tab stays in sync with the
 * Overview's preview without a second network call.
 *
 * Limit is generous (200) — this tab replaces the Overview's 5-row preview
 * with the full list. The hook's cache is keyed on the limit, so the
 * Overview's `useAccountLoans(5)` and this one coexist independently.
 */
export function MyApplicationsTab() {
    const navigate = useNavigate();
    const { data, isLoading } = useAccountLoans(200);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                Loading…
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="py-12 text-center text-sm text-muted-foreground">
                You haven&apos;t submitted any loan applications yet.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Form Number</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied On</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((app) => {
                    // RUNTIME BUG (pre-existing, tracked out of scope):
                    //   The backend `ProcessedLoanResponse` returns `LamId`
                    //   (EBI.ALAS.Api/Features/Account/AccountDtos.cs:63-70)
                    //   but the FE `ProcessedLoan` interface in
                    //   `src/lib/api/account.ts:51-58` declares `formNumber`,
                    //   so `app.formNumber` is `undefined` at runtime. We
                    //   render whatever string is present and fall back to
                    //   the underlying `lamId` field via a single typed
                    //   widening; a follow-up type-cleanup task will rename
                    //   the FE field to `lamId`.
                    const rawApp = app as unknown as {
                        id: number;
                        formNumber?: string;
                        lamId?: string;
                        clientName: string;
                        status: string;
                        applicationDate: string;
                    };
                    const formNumber =
                        rawApp.formNumber ?? rawApp.lamId ?? `#${rawApp.id}`;

                    return (
                        <TableRow key={app.id}>
                            <TableCell className="font-medium">
                                {formNumber}
                            </TableCell>
                            <TableCell>{app.clientName}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{app.status}</Badge>
                            </TableCell>
                            <TableCell>
                                {format(
                                    new Date(app.applicationDate),
                                    "MMM d, yyyy"
                                )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {/* ProcessedLoan has no lastUpdated field;
                                    fall back to applicationDate as the closest
                                    timestamp we know about. */}
                                {format(
                                    new Date(app.applicationDate),
                                    "MMM d, yyyy"
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        navigate(
                                            `/loans/monitoring?id=${app.id}`
                                        )
                                    }
                                >
                                    View Details
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
