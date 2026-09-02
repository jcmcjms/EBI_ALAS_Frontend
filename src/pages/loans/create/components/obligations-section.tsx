import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";

import { useLoanTransfers } from "../hooks/useLoanTransfers";
import { TransferActionMenu } from "./transfer-action-menu";

export function ObligationsSection() {
    const { control } = useFormContext();
    const { arrays, handleTransfer } = useLoanTransfers();
    const { fields: outstandingFields } = arrays.outstanding;

    // Render the rows from the watched form state, not from the
    // `useFieldArray` snapshot, so a row transferred into this section
    // appears immediately and a row transferred out disappears without
    // a stale-render flash.
    const watchedLoans = (useWatch({ control, name: "outstandingLoans" }) as Array<{
        pn?: string;
        principalBalance?: number;
        amortization?: number;
        outstandingBalance?: number;
        dateGranted?: string;
        dateMaturity?: string;
        status?: string;
    }>) || [];

    const totalOutstanding = watchedLoans.reduce(
        (sum, loan) => sum + (loan?.outstandingBalance || 0),
        0,
    );

    return (
        <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">4. Outstanding Loans</CardTitle>
                    <div className="text-sm text-muted-foreground">
                        Total Outstanding:{" "}
                        <span className="font-bold text-foreground">
                            ₱{totalOutstanding.toLocaleString()}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[100px]">PN</TableHead>
                            <TableHead className="text-right">Principal Balance</TableHead>
                            <TableHead className="text-right">Amortization</TableHead>
                            <TableHead className="text-right">Outstanding Balance</TableHead>
                            <TableHead>Date Granted</TableHead>
                            <TableHead>Date Maturity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]">
                                <span className="sr-only">Row actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {watchedLoans.length > 0 ? (
                            watchedLoans.map((loan, i) => (
                                <TableRow
                                    key={outstandingFields[i]?.id ?? i}
                                    className="hover:bg-muted/30"
                                >
                                    <TableCell className="font-mono text-xs">
                                        {loan?.pn}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        ₱{(loan?.principalBalance ?? 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        ₱{(loan?.amortization ?? 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        ₱{(loan?.outstandingBalance ?? 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {loan?.dateGranted
                                            ? new Date(loan.dateGranted).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {loan?.dateMaturity
                                            ? new Date(loan.dateMaturity).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal text-xs">
                                            {loan?.status || "—"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <TransferActionMenu
                                            currentSection="outstanding"
                                            onTransfer={(target) =>
                                                handleTransfer(
                                                    "outstanding",
                                                    outstandingFields[i]?.id ?? "",
                                                    target,
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-center text-xs text-muted-foreground py-4"
                                >
                                    No outstanding loans found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
