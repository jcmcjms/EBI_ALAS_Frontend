import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
    CheckCircle,
    CircleNotch,
    ListChecks,
    MagnifyingGlass,
    Receipt,
    Stack,
    WarningCircle,
} from "@phosphor-icons/react";

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
import { cn } from "@/src/lib/utils";
import { getErrorMessage } from "@/src/lib/apiClient";
import { getOutstandingLoans, getPendingLoan } from "@/src/lib/api/webloans";
import type { OutstandingLoan, PendingLoan } from "@/src/lib/api/types";

import type { LoanApplicationFormData } from "../schema";
import { PreLoanPicker } from "./preloan-picker";
import type { PreLoanItem } from "@/src/lib/api/types";

interface ActiveLoansTableProps {
    /** CIS number whose pending loans to display. */
    cisNo: string;
    /**
     * Account numbers owned by the borrower (from `b.lai`). Rendered as the
     * options in the account-number picker. Empty list = component is idle.
     */
    accounts: string[];
    /**
     * Pending-loan count of the currently loaded profile — used as a hint
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
 * "Account & Preloan" — once the AO picks an LAI (account), this island
 * fans out two parallel reads against the WebLoan API and lets the AO
 * pick which in-flight loan number they want to base the new application
 * on.
 *
 * **Endpoint fan-out (parallel via `Promise.allSettled`):**
 *  - `GET .../outstanding-loans` — every active `loan_data` row for the
 *    (CIS, account) pair. Pre-fills the "Outstanding Loans" table on the
 *     new-loan form (the obligations section in step 4). Backend filters
 *     by branch (bch) server-side from the JWT.
 *  - `GET .../pending-loan` — in-flight `pre_loan_data` rows for the same
 *    pair, joined with `loan_data` so the AO sees product/purpose/rate.
 *    Drives the loan-number picker; also carries the CIS-level NTHP +
 *    NTHP-date (CCR07 row) which we hydrate into the form.
 *
 * The two endpoints are independent (different tables, different key
 * columns) so we fire them in parallel and tolerate one failing while
 * the other succeeds — `/pending-loan` 404 is the same anti-enumeration
 * guard as `/outstanding-loans`, so a single toast covers both.
 *
 * Once a loan number is picked the picker sub-step renders inside this
 * card so the relationship "account → loan number → preloan" is obvious
 * at a glance. The PreLoanPicker fetches `GET /api/preloans?cisNo=&accountNo=`
 * which is server-side filtered by JWT user.branchId (== userBranchId).
 *
 * The component is a pure presentational island: parent owns the
 * (cis, accounts) inputs, the component owns the (selected account,
 * selected loan number, loading, error, data) state.
 */
export function ActiveLoansTable({
    cisNo,
    accounts,
    totalActiveLoansCount,
    userBranchId,
    selectedPreLoanId,
    onPreLoanChange,
}: ActiveLoansTableProps) {
    const { setValue } = useFormContext<LoanApplicationFormData>();

    const [selectedAccount, setSelectedAccount] = useState<string>("");
    const [loans, setLoans] = useState<PendingLoan[]>([]);
    const [selectedLoanNo, setSelectedLoanNo] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    const handleFetch = async (accountNo: string) => {
        if (!accountNo || !cisNo) return;
        setSelectedAccount(accountNo);
        // Clear any loan/pn that was tied to a *previous* account so the
        // picker's list refreshes alongside the pending-loan list. Calling
        // the parent setter is fine here because it does not cascade back
        // into our local state — the parent owns `selectedPreLoanId`.
        setSelectedLoanNo("");
        onPreLoanChange("", null);
        // Wipe any obligations row that came from a previous account — the
        // outstanding balance is loan-specific and must not leak across
        // account switches. We also wipe the CIS-level NTHP / NTHP-date
        // and any previously-picked loan parameters so a stale balance
        // from the previous (cis, account) pair can't leak through either;
        // the fresh fetch below re-hydrates them from the response.
        setValue("outstandingLoans", []);
        setValue("client.netTakeHomePay", 0);
        setValue("loan.nthpDate", "");
        setValue("loan.proposedAmount", 0);
        setValue("loan.interestRate", 0);
        setValue("loan.term", 0);
        setValue("loan.product", "");
        setValue("loan.purpose", "");
        setIsLoading(true);
        setLoadError(null);

        // Fire both reads in parallel. The endpoints are independent
        // (different tables, different key columns) and each carries its
        // own (cisNo, accountNo) anti-enumeration guard, so we tolerate
        // either failing alone without losing the data from the other.
        const [outstandingResult, pendingResult] = await Promise.allSettled([
            getOutstandingLoans(cisNo, accountNo),
            getPendingLoan(cisNo, accountNo),
        ]);

        // Surface the first error we see — both endpoints share the same
        // 404 semantics (account↔CIS pair unknown), so one toast covers
        // either failure and the caller treats it as "fetch failed".
        const firstRejection =
            (outstandingResult.status === "rejected"
                ? outstandingResult.reason
                : null) ??
            (pendingResult.status === "rejected" ? pendingResult.reason : null);

        if (firstRejection) {
            const message = getErrorMessage(firstRejection);
            setLoans([]);
            setHasFetched(true);
            setLoadError(message);
            toast.error(message);
            setIsLoading(false);
            return;
        }

        // ── Hydrate Outstanding Loans table from /outstanding-loans ─────
        // The backend's `principalBalance` IS the OUTSTANDING BALANCE
        // (mirrors `loan_data.principal_bal`); we map it straight onto
        // the form's `outstandingBalance` column. The original principal
        // (`loan_data.principal`) feeds the `principalBalance` column so
        // the AO can see both side by side. The backend's `OutstandingLoanDto`
        // doesn't expose amortization, so that column stays 0 until the
        // AO enters it manually.
        if (outstandingResult.status === "fulfilled") {
            const obRows = outstandingResult.value.loans ?? [];
            setValue(
                "outstandingLoans",
                obRows.map((row: OutstandingLoan) => ({
                    pn: row.loanNo ?? "",
                    principalBalance: row.principal ?? 0,
                    amortization: 0,
                    outstandingBalance: row.principalBalance ?? 0,
                    dateGranted: row.dateGranted
                        ? row.dateGranted.slice(0, 10)
                        : "",
                    dateMaturity: row.dateMaturity
                        ? row.dateMaturity.slice(0, 10)
                        : "",
                    status: row.productStatus ?? "Active",
                })),
                { shouldDirty: false }
            );
        }

        // ── Hydrate picker + CIS-level fields from /pending-loan ───────
        if (pendingResult.status === "fulfilled") {
            const pending = pendingResult.value;
            setLoans(pending.loans ?? []);

            // NTHP + NTHP date live at the response root on this endpoint
            // (CIS-level, joined from check_list_data WHERE item='CCR07').
            // The form's `client.netTakeHomePay` is `number`, so we coerce
            // the backend's decimal-string into a number before setValue;
            // an empty/invalid value leaves the field at its cleared 0.
            //
            // The backend ships the NTHP as a *formatted* decimal string
            // (e.g. `"5,000.00"` — thousands-separator with a comma), so
            // a raw `Number(...)` would yield NaN. Strip commas first.
            const nthpValue = Number(pending.nthp?.replace(/,/g, "") ?? "");
            if (pending.nthp && Number.isFinite(nthpValue)) {
                setValue("client.netTakeHomePay", nthpValue, {
                    shouldDirty: false,
                });
            }
            if (pending.nthpDate) {
                // Backend returns ISO 8601 (date or datetime) — keep just
                // the yyyy-MM-dd portion for the <input type="date">.
                setValue("loan.nthpDate", pending.nthpDate.slice(0, 10), {
                    shouldDirty: false,
                });
            }
        }

        setHasFetched(true);
        setIsLoading(false);
    };

    const handleLoanPick = (loanNo: string) => {
        setSelectedLoanNo(loanNo);
        const picked = loans.find((l) => l.loanNo === loanNo);
        if (!picked) return;

        // The "Outstanding Loans" table is now driven by the
        // /outstanding-loans endpoint (see handleFetch) and intentionally
        // NOT mutated here — picking a loan number identifies which
        // in-flight preloan this application is based on; it doesn't
        // narrow the obligations list. The two are independent.

        // ── Hydrate Loan Parameters from the picked loan row ────────────
        // The pending-loan endpoint pre-joins loan_data fields onto the
        // pre_loan_data row, so each card carries the proposed product /
        // purpose / granted rate / term-in-days / outstanding principal.
        // Map those onto the form so the Loan Parameters section pre-fills
        // the moment the AO picks a loan — they remain editable, but the
        // values match what the backend sourced from loan_data.
        setValue("loan.product", picked.productWithDescription ?? "", {
            shouldDirty: false,
        });
        setValue("loan.purpose", picked.loanPurpose ?? "", {
            shouldDirty: false,
        });
        if (picked.principal != null && Number.isFinite(picked.principal)) {
            setValue("loan.proposedAmount", picked.principal, {
                shouldDirty: false,
            });
        }
        if (picked.grantedRate != null && Number.isFinite(picked.grantedRate)) {
            setValue("loan.interestRate", picked.grantedRate, {
                shouldDirty: false,
            });
        }
        if (picked.totalTermDays != null && Number.isFinite(picked.totalTermDays)) {
            // Backend reports term in days (`total_amortization * 30`);
            // the form's `loan.term` is months, so round days ÷ 30.
            setValue("loan.term", Math.round(picked.totalTermDays / 30), {
                shouldDirty: false,
            });
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
                                    Unable to load pending loans
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
                        aria-label="Loading pending loans"
                    >
                        <div className="flex items-center gap-2">
                            <CircleNotch
                                size={16}
                                weight="bold"
                                className="animate-spin text-primary"
                            />
                            <Skeleton className="h-3 w-40" />
                        </div>
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                    </div>
                )}

                {/* Loan number picker (radio-style cards) — only after the
                    pending-loan list has been fetched. The principalBalance
                    of the picked loan is what pre-fills the Outstanding
                    Loans table (handled in `handleLoanPick`). */}
                {!isLoading && hasFetched && loans.length > 0 && (
                    <section
                        aria-label="Pending loan selection"
                        className="space-y-3"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Loan Number
                                </h4>
                               
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                {loans.length} loan
                                {loans.length === 1 ? "" : "s"} in flight for
                                account{" "}
                                <span className="font-mono">
                                    {selectedAccount}
                                </span>
                            </span>
                        </div>

                        <div
                            role="radiogroup"
                            aria-label="Select a loan number"
                            className="grid gap-2"
                        >
                            {loans.map((l) => {
                                const isSelected =
                                    selectedLoanNo === l.loanNo;
                                return (
                                    <button
                                        key={l.loanNo}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() =>
                                            handleLoanPick(l.loanNo)
                                        }
                                        className={cn(
                                            "group relative flex w-full items-start gap-3 rounded-md border bg-background p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                                                : "border-border"
                                        )}
                                    >
                                        {/* Radio indicator */}
                                        <div
                                            className={cn(
                                                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                                isSelected
                                                    ? "border-primary bg-primary"
                                                    : "border-muted-foreground/40 group-hover:border-primary/60"
                                            )}
                                            aria-hidden
                                        >
                                            {isSelected && (
                                                <CheckCircle
                                                    size={12}
                                                    weight="fill"
                                                    className="text-primary-foreground"
                                                />
                                            )}
                                        </div>

                                        {/* Body */}
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs font-semibold">
                                                    {l.loanNo}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px]"
                                                >
                                                    {l.productWithDescription}
                                                </Badge>
                                                {l.loanPurpose && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px]"
                                                    >
                                                        {l.loanPurpose}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs tabular-nums text-muted-foreground">
                                                Proposed Balance:{" "}
                                                <span className="font-medium text-foreground">
                                                    ₱
                                                    {(
                                                        l.principal ?? 0
                                                    ).toLocaleString()}
                                                </span>
                                                {" · "}
                                                Rate:{" "}
                                                <span className="font-medium text-foreground">
                                                    {l.grantedRate ?? "—"}%
                                                </span>
                                                {l.totalTermDays != null && (
                                                    <>
                                                        {" · "}Term:{" "}
                                                        <span className="font-medium text-foreground">
                                                            {l.totalTermDays}d
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Empty success state */}
                {!isLoading && hasFetched && loans.length === 0 && !loadError && (
                    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
                        <ListChecks size={14} weight="bold" />
                        Account {selectedAccount} has no in-flight loans.
                    </div>
                )}

                {/* Pristine helper text — no account chosen yet */}
                {!isLoading && !hasFetched && (
                    <p className="text-xs text-muted-foreground">
                        Select an account above to load pending loans.
                    </p>
                )}

                {/* ── Preloan picker (step 3) ───────────────────────────── */}
                {/* Renders only after an account has been picked AND a loan
                    number has been chosen — keeps the wizard's sequencing
                    explicit (account → loan → preloan). */}
                {selectedAccount &&
                    hasFetched &&
                    selectedLoanNo && (
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
                {!selectedLoanNo && selectedAccount && hasFetched && loans.length > 0 && (
                    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
                        <Stack size={14} weight="bold" />
                        Pick a loan number above to enable preloan selection.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}