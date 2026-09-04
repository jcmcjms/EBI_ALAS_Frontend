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
import type { OutstandingLoan, PendingLoan, WebLoanAccount } from "@/src/lib/api/types";

import type { LoanApplicationFormData } from "../schema";
import {
    CREATION_TYPE,
    type CreationTypeCode,
} from "../schema";
import type { PreLoanItem } from "@/src/lib/api/types";

interface ActiveLoansTableProps {
    /** CIS number whose pending loans to display. */
    cisNo: string;
    /**
     * Accounts (LAI rows) attached to the borrower — sourced from
     * `WebLoanCisSearchResponse.accounts`. Each entry carries both the
     * bare `accountNo` and the combined `accountId` ("<branchCode>-<accountNo>")
     * the two drill-down endpoints expect on their route. Empty list =
     * component is idle.
     */
    accounts: WebLoanAccount[];
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
 *     new-loan form (the obligations section in step 4). The route
 *     parameter is the combined `accountId` ("<branchCode>-<accountNo>");
 *     the branch is part of the account identity.
 *  - `GET .../pending-loan` — in-flight `pre_loan_data` rows for the same
 *    pair, joined with `loan_data` so the AO sees product / purpose /
 *    rate / creation-type. Drives the loan-number picker; also carries
 *    the CIS-level NTHP + NTHP-date (CCR07 row) which we hydrate into
 *    the form.
 *
 * The two endpoints are independent (different tables, different key
 * columns) so we fire them in parallel and tolerate one failing while
 * the other succeeds — `/pending-loan` 404 is the same anti-enumeration
 * guard as `/outstanding-loans`, so a single toast covers both.
 *
 * Once a loan number is picked the picker sub-step renders inside this
 * card so the relationship "account → loan number → preloan" is obvious
 * at a glance. The PreLoanPicker fetches `GET /api/preloans?cisNo=&accountNo=`
 * which is a separate controller (still takes bare `accountNo`).
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

    // Local state holds the combined `accountId` (the URL parameter the
    // backend expects). The PreLoanPicker still takes the bare
    // `accountNo` — it's a different controller (`/api/preloans`).
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [loans, setLoans] = useState<PendingLoan[]>([]);
    const [selectedLoanNo, setSelectedLoanNo] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    // Resolve the bare accountNo + display label for the currently
    // selected accountId, so downstream code (PreLoanPicker, error /
    // empty messages) can speak in the term the user is used to seeing.
    const selectedAccount = accounts.find(
        (a) => a.accountId === selectedAccountId
    );
    const selectedAccountNo = selectedAccount?.accountNo ?? "";

    const handleFetch = async (accountId: string) => {
        if (!accountId || !cisNo) return;
        // Resolve the bare accountNo before any state mutation so the
        // form-clear block below can identify the account the user is
        // switching FROM (used in toast / error messages downstream).
        const accountRow = accounts.find((a) => a.accountId === accountId);
        if (!accountRow) return;
        setSelectedAccountId(accountId);
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
        // Loan creation type is sourced from the picked pending-loan's
        // `creationType` (raw code) + `creationTypeLabel`. Clearing
        // both on account switch prevents the previously-picked loan's
        // type from leaking across accounts — the hide-condition for
        // Section 4 ("Outstanding Loans") reads the code, so we MUST
        // reset both fields together or the wizard would either
        // remember a stale "New Loan" hide from a previous account or
        // render an empty label with a non-null code (or vice versa).
        setValue("branchType.creationTypeCode", null);
        setValue("branchType.creationTypeLabel", "");
        setIsLoading(true);
        setLoadError(null);

        // Fire both reads in parallel. The endpoints are independent
        // (different tables, different key columns) and each carries its
        // own (cisNo, accountId) anti-enumeration guard, so we tolerate
        // either failing alone without losing the data from the other.
        // Both endpoints take the combined `accountId` ("<bch>-<acctNo>").
        const [outstandingResult, pendingResult] = await Promise.allSettled([
            getOutstandingLoans(cisNo, accountId),
            getPendingLoan(cisNo, accountId),
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
        // the AO can see both side by side. The backend's
        // `OutstandingLoanDto.amortAmount` (CASE-computed: principal
        // for C35/C23 products, otherwise amort_data.total_amort for
        // the first installment) feeds the `amortization` column so
        // the AO no longer has to enter it by hand. A null backend
        // value falls through to 0 — the obligations table renders
        // missing amortization as "₱0".
        if (outstandingResult.status === "fulfilled") {
            const obRows = outstandingResult.value.loans ?? [];
            setValue(
                "outstandingLoans",
                obRows.map((row: OutstandingLoan) => ({
                    pn: row.loanNo ?? "",
                    principalBalance: row.principal ?? 0,
                    amortization: row.amortAmount ?? 0,
                    outstandingBalance: row.principalBalance ?? 0,
                    dateGranted: row.dateGranted
                        ? row.dateGranted.slice(0, 10)
                        : "",
                    dateMaturity: row.dateMaturity
                        ? row.dateMaturity.slice(0, 10)
                        : "",
                    status: row.productStatus ?? "Active",
                    // Carry the backend's pre-joined product description
                    // (e.g. "C35 - Quick Loan") onto the row so the
                    // Outstanding → EBI transfer can use it as the EBI
                    // reloan's `name` — see `mapToEbi` in
                    // `loan-transfer-utils.ts`. `status` (above) is the
                    // loan's *status label* and is intentionally
                    // distinct from this product description.
                    productWithDescription: row.productWithDescription ?? "",
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
// Loan Type in the Branch & Type section is sourced from the
// picked pending-loan row's `creationType` (raw byte) + matching
// label. We write *both* fields in lockstep because:
//   - `creationTypeCode` (typed 0|1|2|6|null) drives the wizard
//     logic — Section 4 ("Outstanding Loans") is hidden when the
//     code is NEW_LOAN (0) or ADDITIONAL_LOAN (6); see
//     `HidesOutstandingLoans` in `schema.ts`.
//   - `creationTypeLabel` (e.g. "New Loan", "Additional Loan") is
//     what the AO sees in Section 1.2 ("Branch & type") and what
//     the printed approval form renders.
//
// Narrowing: the backend's `creationType` is `number | null`. We
// accept only the four valid codes (0/1/2/6) and coerce anything
// else — including a future unrecognized code, or a `null` when no
// `loan_data` row joined onto the preloan — to `null`. The schema
// (see `creationTypeCodeSchema` in `schema.ts`) hard-blocks
// unknown codes at parse time, but null is always valid and means
// "default the Section-4 hide-state to its conservative value
// (show)". The label is the backend's verbatim string — we never
// re-derive it from the code, so a localized label (e.g. Filipino)
// would still round-trip through the form intact. The runtime
// guard below (`KNOWN_CODES.has(...)`) does NOT narrow the type
// for TS (Set.has returns `boolean`, not a type-predicate), so we
// cast through the typed alias to satisfy the schema.
const KNOWN_CODES: ReadonlySet<CreationTypeCode> = new Set([
    CREATION_TYPE.NEW_LOAN,
    CREATION_TYPE.RELOAN,
    CREATION_TYPE.RESTRUCTURED,
    CREATION_TYPE.ADDITIONAL_LOAN,
]);
const rawCode = picked.creationType;
const code: CreationTypeCode | null =
    rawCode != null && (KNOWN_CODES as Set<number>).has(rawCode)
        ? (rawCode as CreationTypeCode)
        : null;
setValue("branchType.creationTypeCode", code, { shouldDirty: false });
setValue("branchType.creationTypeLabel", picked.creationTypeLabel ?? "", {
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
            // Backend reports term in days (`total_amortization * 30`),
            // and the form's `loan.term` is now days as well — pass
            // through unchanged. Round to a whole number to keep the
            // Zod integer check happy.
            setValue("loan.term", Math.round(picked.totalTermDays), {
                shouldDirty: false,
            });
        }
    };

    // Keying the island by the loaded borrower's CIS id guarantees the entire
    // sub-tree (selected account, fetched loans, attached preloan) is unmounted
    // and remounted fresh whenever the AO switches clients — no explicit
    // effect-driven reset required.
    return (
        <Card key={cisNo} className="shadow-none">
            <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt size={16} weight="bold" className="text-primary" />
                    <span className="tabular-nums text-muted-foreground">1.3</span>
                    Account & preloan
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
                            value={selectedAccountId}
                            onValueChange={(val) => handleFetch(val as string)}
                        >
                            <SelectTrigger
                                id="active-loans-account"
                                className="h-10 w-full"
                            >
                                <SelectValue placeholder="Select an LAI..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((acct) => (
                                    <SelectItem
                                        key={acct.accountId}
                                        value={acct.accountId}
className=""
                                    >
                                        {/* Render the combined "<bch>-<acctNo>"
                                            form so the AO sees the branch
                                            alongside the account number —
                                            matches the route parameter the
                                            backend will use. The borrower
                                            name (when present) appears as a
                                            muted suffix for context. */}
                                        {acct.accountId}
                                        {acct.name ? (
                                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                · {acct.name}
                                            </span>
                                        ) : null}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            selectedAccountId && handleFetch(selectedAccountId)
                        }
                        disabled={!selectedAccountId || isLoading}
                        className="h-10 shrink-0 gap-1.5 font-normal"
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
                            onClick={() => handleFetch(selectedAccountId)}
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
                                <span className="">
                                    {selectedAccountId}
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
                                                <span className="text-xs font-semibold">
                                                    {l.loanNo}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px]"
                                                >
                                                    {l.productWithDescription}
                                                </Badge>
                                                {/* Creation type ("New Loan" /
                                                    "Reloan" / "Restructured" /
                                                    "Additional Loan" /
                                                    "Unknown") — surfaced
                                                    so the AO can tell at a
                                                    glance whether the
                                                    application is a brand-new
                                                    loan or a re-loan /
                                                    restructure. Sourced from
                                                    loan_data.creation_type. */}
                                                {l.creationTypeLabel && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px]"
                                                    >
                                                        {l.creationTypeLabel}
                                                    </Badge>
                                                )}
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
                        Account {selectedAccountId} has no in-flight loans.
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
                    explicit (account → loan → preloan).

                    PreLoanPicker calls `/api/preloans` (a different
                    controller that still takes the bare `accountNo`), so
                    we hand it the accountNo parsed out of the combined
                    accountId — NOT the accountId itself. */}
                {selectedAccountId &&
                    hasFetched &&
                    selectedLoanNo && (
                        <>
                            <div className="my-2 border-t border-dashed" />

                        </>
                    )}
                {!selectedLoanNo && selectedAccountId && hasFetched && loans.length > 0 && (
                    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
                        <Stack size={14} weight="bold" />
                        Pick a loan number above to enable preloan selection.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}