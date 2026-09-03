import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";

import { useLoanTransfers } from "../hooks/useLoanTransfers";
import { TransferActionMenu } from "./transfer-action-menu";

export function ObligationsSection() {
    const { control } = useFormContext();
    const { arrays, handleTransfer } = useLoanTransfers();
    const outstandingFields = arrays.outstanding.fields;

    // Re-render when the underlying outstanding-loans form state changes
    // (the AO types into a row, the active-loans-table hydrates from
    // /outstanding-loans, etc.). We don't actually *read* this value
    // here — iteration is driven by `outstandingFields` below — but
    // subscribing to it ensures the component re-renders whenever any
    // field in this section mutates.
    const watchedLoans = (useWatch({ control, name: "outstandingLoans" }) as Array<{
        pn?: string;
        principalBalance?: number;
        amortization?: number;
        outstandingBalance?: number;
        dateGranted?: string;
        dateMaturity?: string;
        status?: string;
    }>) || [];

    // ── Iterate `useFieldArray.fields` (not `useWatch`) ─────────────────
    // Iterating over `arrays.outstanding.fields` is the only reliable
    // way to get a stable RHF-generated `id` per row. The previous
    // version mapped over `useWatch`'s data array and then *guessed*
    // the id by indexing `fields[i]` — that index frequently desyncs
    // from the data index (e.g. when `setValue("outstandingLoans", [...])`
    // replaces the whole array in `active-loans-table.tsx`, which
    // bypasses `useFieldArray`'s mutation API). The desync surfaced as
    // "Could not transfer loan — source row not found." when the user
    // tried to move a row from Outstanding to EBI. Iterating the
    // `fields` snapshot directly removes the guess entirely: every
    // `field.id` here is the *same* id `useFieldArray`'s `remove` will
    // accept on the matching `findIndex` inside `useLoanTransfers`.
    //
    // `watchedLoans` (from `useWatch`) is kept as the source of truth
    // for the row *data* the cells display — `getValues` returns a
    // snapshot from render time, while `useWatch` re-renders the
    // component on every mutation. `i` from `outstandingFields.map` is
    // also the correct index into `watchedLoans`, since both arrays
    // describe the same RHF store.
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
                        {outstandingFields.length > 0 ? (
                            outstandingFields.map((field, i) => {
                                // `i` here is the index into `useFieldArray`'s
                                // `fields` snapshot, which matches `watchedLoans`'s
                                // index for the same row (both reflect the same
                                // RHF store on every render).
                                const loan = watchedLoans[i];
                                return (
                                    <TableRow
                                        key={field.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <TableCell className="text-xs">
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
                                                    // Pass `field.id` directly — it is the
                                                    // RHF-generated id for this exact row,
                                                    // and `useFieldArray.findIndex` inside
                                                    // the hook will find it unambiguously.
                                                    handleTransfer("outstanding", field.id, target)
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
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
