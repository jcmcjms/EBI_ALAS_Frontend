import { useState } from "react";
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
import type { ActiveLoan, PreLoanItem } from "@/src/lib/api/types";

import { PreLoanPicker } from "./preloan-picker";

interface ActiveLoansTableProps {
    /** CIS number whose active loans to display. */
    cisNo: string;
    /**
     * Account numbers owned by the borrower (from `b.lai`). Rendered as the
     * options in the account-number picker. Empty list = component is idle.
     */
    accounts: string[];
    /**
     * Active loan count of the currently loaded profile — used as a hint
     * to the user (e.g. "Top 10 active loans") and to make the table
     * section appear meaningful even before any account is selected.
     */
    totalActiveLoansCount?: number;
    /** Acting user's branch id — used by the PreLoanPicker scope chip. */
    userBranchId: string;
    /**
     * Currently selected preloan id. Controlled by the parent so the form
     * state stays in sync across the whole wizard.
     */
    selectedPreLoanId: string;
    /** Callback fired when the AO picks / clears a preloan. */
    onPreLoanChange: (id: string, preloan: PreLoanItem | null) => void;
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
 * Once an account is chosen, the PreLoanPicker sub-step renders **inside this
 * card** so the relationship "account → preloan" is obvious at a glance. The
 * picker fetches GET /api/preloans?cisNo=&accountNo= which is server-side
 * filtered by JWT user.branchId (== userBranchId).
 *
 * The component is a pure presentational island: parent owns the (cis, accounts)
 * inputs, the component owns the (selected account, loading, error, data) state.
 */
export function ActiveLoansTable({
    cisNo,
    accounts,
    totalActiveLoansCount,
    userBranchId,
    selectedPreLoanId,
    onPreLoanChange,
}: ActiveLoansTableProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>("");
    const [loans, setLoans] = useState<ActiveLoan[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    const handleFetch = async (accountNo: string) => {
        if (!accountNo || !cisNo) return;
        setSelectedAccount(accountNo);
        // Clear any preloan that was tied to a *previous* account so the
        // picker's list refreshes alongside the active-loan list. Calling
        // the parent setter is fine here because it does not cascade back
        // into our local state — the parent owns `selectedPreLoanId`.
        onPreLoanChange("", null);
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

    // Keying the island by the loaded borrower's CIS id guarantees the entire
    // sub-tree (selected account, fetched loans, attached preloan) is unmounted
    // and remounted fresh whenever the AO switches clients — no explicit
    // effect-driven reset required.
    return (
        <Card key={cisNo}>
            <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Receipt size={20} weight="bold" className="text-primary" />
                    2. Account & Preloan
                    {typeof totalActiveLoansCount === "number" &&
                        totalActiveLoansCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {totalActiveLoansCount} on file
                            </Badge>
                        )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                {/* LAI picker — only after the borrower profile is loaded */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <label
                            htmlFor="active-loans-account"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            LAI (Loan Application Index)
                        </label>
                        <Select
                            value={selectedAccount || undefined}
                            onValueChange={(val) => handleFetch(val as string)}
                        >
                            <SelectTrigger
                                id="active-loans-account"
                                className="h-10 w-full font-mono"
                            >
                                <SelectValue placeholder="Select an LAI..." />
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
                        Select an account above to load active loans.
                    </p>
                )}

                {/* ── Preloan picker (step 3) ───────────────────────────── */}
                {/* Renders only after an account has been picked; the picker
                    itself owns its own (loading / error / data) state. */}
                {selectedAccount && hasFetched && (
                    <>
                        <div className="my-2 border-t border-dashed" />
                        <PreLoanPicker
                            key={`${cisNo}:${selectedAccount}`}
                            cisNo={cisNo}
                            accountNo={selectedAccount}
                            userBranchId={userBranchId}
                            value={selectedPreLoanId}
                            onChange={onPreLoanChange}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}
