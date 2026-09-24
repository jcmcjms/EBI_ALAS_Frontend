/**
 * My Applications tab — full table of the officer's processed loan applications.
 */

import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
import { useAccountLoans } from "../hooks/use-account";

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
                    // Backend returns `LamId` but FE type declares `formNumber`.
                    // Render whatever string is present, falling back to lamId.
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
                            <TableCell className="font-medium">{formNumber}</TableCell>
                            <TableCell>{app.clientName}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{app.status}</Badge>
                            </TableCell>
                            <TableCell>
                                {format(new Date(app.applicationDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(app.applicationDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        navigate(`/loans/monitoring?id=${app.id}`)
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
