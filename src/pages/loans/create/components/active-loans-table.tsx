import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListChecks, MagnifyingGlass, Receipt, WarningCircle } from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/src/components/ui/select";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table";
import { getErrorMessage } from "@/src/lib/apiClient";
import { getActiveLoansByAccount } from "@/src/lib/api/webloans";
import type { ActiveLoan } from "@/src/lib/api/types";

interface ActiveLoansTableProps {
    /** CIS number whose active loans to display. */
    cisNo: string;
    /**
     * Account numbers owned by the borrower (from `b.lai`). Rendered as the
     * options in the account-number picker. Empty list = component is idle.
     */
    accounts: string[];
    /**
     * Active loan count of the currently loaded profile — used as a hint to
     * the user (e.g. "Top 10 active loans") and to make the table section
     * appear meaningful even before any account is selected.
     */
    totalActiveLoansCount?: number;
}

/**
 * "Active Loans by existing borrower" — fetches up to 10 active (loan_status != 10)
 * PN rows for the selected (CIS, account) pair and renders them in a table.
 *
 * Backed by GET /api/webloans/cis/{cisNo}/accounts/{accountNo}/active-loans,
 * which mirrors the reference SQL exactly:
 *   SELECT TOP 10 * FROM dbo.loan_data
 *    WHERE acct_no = @acct AND bch = '000'
 *      AND webloan.dbo.is_loan(loan_no) = 1
 *      AND loan_status != 10
 *    ORDER BY date_granted DESC
 *
 * The component is a pure presentational island: parent owns the (cis, accounts)
 * inputs, the component owns the (selected account, loading, error, data) state.
 */
export function ActiveLoansTable({
    cisNo,
    accounts,
    totalActiveLoansCount,
}: ActiveLoansTableProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>("");
    const [loans, setLoans] = useState<ActiveLoan[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    // When the loaded borrower changes (new CIS lookup, "Change client"),
    // reset everything so a stale (cis, account) never leaks into the new
    // profile's results. Mirrors the explicit reset pattern in cis-lookup.
    useEffect(() => {
        setSelectedAccount("");
        setLoans([]);
        setIsLoading(false);
        setLoadError(null);
        setHasFetched(false);
    }, [cisNo]);

    const handleFetch = async (accountNo: string) => {
        if (!accountNo || !cisNo) return;
        setSelectedAccount(accountNo);
        setIsLoading(true);
        setLoadError(null);

        try {
            const result = await getActiveLoansByAccount(cisNo, accountNo);
            setLoans(result.loans ?? []);
            setHasFetched(true);
        } catch (error) {
            // 404 from the backend means the (cis, account) pair is invalid —
            // surface it as an empty/error state rather than letting the toast
            // disappear before the user can read it.
            const message = getErrorMessage(error);
            setLoans([]);
            setHasFetched(true);
            setLoadError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    // If the borrower has no accounts at all, there is nothing to render
    // beyond a single hint. The LAI list is empty for a brand-new borrower
    // or for one whose webloan account rows have not yet been linked.
    if (accounts.length === 0) {
        return (
            <Card>
                <CardHeader className="border-b bg-muted/30 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Receipt size={20} weight="bold" className="text-primary" />
                        2. Active Loans
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">
                        No loan accounts on file for this CIS — cannot
                        retrieve active loans.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Receipt size={20} weight="bold" className="text-primary" />
                    2. Active Loans
                    {typeof totalActiveLoansCount === "number" &&
                        totalActiveLoansCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {totalActiveLoansCount} on file
                            </Badge>
                        )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                {/* Account picker — only after the borrower profile is loaded */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <label
                            htmlFor="active-loans-account"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Account Number
                        </label>
                        <Select
                            value={selectedAccount || undefined}
                            onValueChange={(val) => handleFetch(val as string)}
                        >
                            <SelectTrigger
                                id="active-loans-account"
                                className="h-10 w-full font-mono"
                            >
                                <SelectValue placeholder="Select an account to view active loans..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((acct) => (
                                    <SelectItem
                                        key={acct}
                                        value={acct}
                                        className="font-mono"
                                    >
                                        {acct}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            selectedAccount && handleFetch(selectedAccount)
                        }
                        disabled={!selectedAccount || isLoading}
                        className="h-10 shrink-0 gap-1.5"
                    >
                        <MagnifyingGlass size={14} weight="bold" />
                        Refresh
                    </Button>
                </div>

                {/* Persistent inline error */}
                {loadError && (
                    <div
                        role="alert"
                        className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                    >
                        <div className="flex items-start gap-2">
                            <WarningCircle
                                size={16}
                                weight="fill"
                                className="mt-0.5 shrink-0"
                            />
                            <div>
                                <p className="font-medium">
                                    Unable to load active loans
                                </p>
                                <p className="text-xs opacity-90">
                                    {loadError}
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 gap-1.5 text-destructive"
                            onClick={() => handleFetch(selectedAccount)}
                        >
                            Retry
                        </Button>
                    </div>
                )}

                {/* Loading skeleton */}
                {isLoading && (
                    <div
                        className="space-y-2 rounded-md border bg-muted/20 p-3"
                        aria-busy="true"
                        aria-label="Loading active loans"
                    >
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-10/12" />
                        <Skeleton className="h-4 w-9/12" />
                    </div>
                )}

                {/* Loaded data */}
                {!isLoading && hasFetched && loans.length > 0 && (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>PN</TableHead>
                                    <TableHead className="text-right">
                                        Principal
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Principal Bal.
                                    </TableHead>
                                    <TableHead>Granted</TableHead>
                                    <TableHead>Maturity</TableHead>
                                    <TableHead>Product / Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loans.map((l) => (
                                    <TableRow key={l.loanNo}>
                                        <TableCell className="font-mono">
                                            {l.loanNo}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {l.principal != null
                                                ? `₱${l.principal.toLocaleString()}`
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {l.principalBalance != null
                                                ? `₱${l.principalBalance.toLocaleString()}`
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {l.dateGranted
                                                ? new Date(
                                                      l.dateGranted,
                                                  ).toLocaleDateString()
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {l.dateMaturity
                                                ? new Date(
                                                      l.dateMaturity,
                                                  ).toLocaleDateString()
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {l.productStatus ??
                                                l.loanProduct ??
                                                "—"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Empty success state */}
                {!isLoading && hasFetched && loans.length === 0 && !loadError && (
                    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
                        <ListChecks size={14} weight="bold" />
                        Account {selectedAccount} has no active loans.
                    </div>
                )}

                {/* Pristine helper text — no account chosen yet */}
                {!isLoading && !hasFetched && (
                    <p className="text-xs text-muted-foreground">
                        Select an account above to load up to 10 active
                        loans (filtered by webloan <code>is_loan()</code>{" "}
                        and <code>loan_status != 10</code>, ordered by
                        date granted, descending).
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
