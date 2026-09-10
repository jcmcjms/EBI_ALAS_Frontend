import { useState } from "react";
import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { cn } from "@/src/lib/utils";
import { getErrorMessage } from "@/src/lib/apiClient";
import { getOutstandingLoans, getPendingLoan } from "@/src/lib/api/webloans";
import type { OutstandingLoan, PendingLoan, WebLoanAccount } from "@/src/lib/api/types";

import type { LoanApplicationFormData, CreationTypeCode } from "../schema";
import { CREATION_TYPE } from "../schema";
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
    /** Callback fired when the AO picks / clears a preloan. */
    onPreLoanChange: (id: string, preloan: PreLoanItem | null) => void;
}

/**
 * Extract product code (e.g., "C21" from "C21 - Salary Loan").
 * Returns null for consolidated products or malformed strings.
 */
function extractProductCode(desc: string | undefined): string | null {
    if (!desc) return null;
    if (desc.startsWith("Consolidated")) return null;
    const dash = desc.indexOf(" - ");
    return dash === -1 ? desc.trim() : desc.slice(0, dash).trim();
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
 * The component uses `useFieldArray` to manage the selected loans array,
 * which enables:
 *  - O(1) lookup for preventing duplicate products via Set
 *  - Proper RHF integration for form state management
 *  - Automatic cleanup when loans are deselected
 */
export function ActiveLoansTable({
    cisNo,
    accounts,
    totalActiveLoansCount,
    onPreLoanChange,
}: ActiveLoansTableProps) {
    const { control, setValue } = useFormContext<LoanApplicationFormData>();

    // useFieldArray manages the loans array in form state
    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "loans",
    });

    // Watch loans array for O(1) product code lookup
    const watchedLoans = useWatch({ control, name: "loans" }) ?? [];

    // Captures the CIS-level NTHP date from /pending-loan so it can be
    // stamped onto each loan's parameters when the AO toggles them on.
    const [pendingNthpDate, setPendingNthpDate] = useState("");
    const selectedProductCodes = new Set(
        watchedLoans.map((f) => f.productCode).filter(Boolean)
    );

    // Local state holds the combined `accountId` (the URL parameter the
    // backend expects). The PreLoanPicker still takes the bare
    // `accountNo` — it's a different controller (`/api/preloans`).
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [loans, setLoans] = useState<PendingLoan[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    // Resolve the bare accountNo + display label for the currently
    // selected accountId, so downstream code (PreLoanPicker, error /
    // empty messages) can speak in the term the user is used to seeing.
    // const selectedAccount = accounts.find(
    //     (a) => a.accountId === selectedAccountId
    // );

    const handleFetch = async (accountId: string) => {
        if (!accountId || !cisNo) return;
        // Resolve the bare accountNo before any state mutation so the
        // form-clear block below can identify the account the user is
        // switching FROM (used in toast / error messages downstream).
        const accountRow = accounts.find((a) => a.accountId === accountId);
        if (!accountRow) return;
        setSelectedAccountId(accountId);

        // Clear all selected loans using a single atomic replace
        replace([]);
        onPreLoanChange("", null);

        // Wipe any obligations row that came from a previous account — the
        // outstanding balance is loan-specific and must not leak across
        // account switches. We also wipe the CIS-level NTHP / NTHP-date
        // and any previously-picked loan parameters so a stale balance
        // from the previous (cis, account) pair can't leak through either;
        // the fresh fetch below re-hydrates them from the response.
        setValue("outstandingLoans", []);
        setValue("client.netTakeHomePay", 0);
        setPendingNthpDate("");

        // Clear creation type since we're switching accounts
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
                // the yyyy-MM-dd portion for the <input type="date"> and
                // stamp it onto every loan's parameters when toggled on.
                const d = pending.nthpDate.slice(0, 10);
                setPendingNthpDate(d);
            }
        }

        setHasFetched(true);
        setIsLoading(false);
    };

    /**
     * Toggle a loan number in/out of the selection using useFieldArray.
     * Enforces "no same product" constraint - if a product is already
     * selected, disable other loans with the same product.
     */
    const handleLoanToggle = (loan: PendingLoan) => {
        const existingIndex = fields.findIndex((f) => f.loanNo === loan.loanNo);

        if (existingIndex > -1) {
            // Deselect: remove from array
            remove(existingIndex);

            // If no loans left, clear branch type
            if (fields.length === 1) {
                setValue("branchType.creationTypeCode", null);
                setValue("branchType.creationTypeLabel", "");
            }
            return;
        }

        // Select: check product constraint
        const productCode = extractProductCode(loan.productWithDescription);

        if (productCode && selectedProductCodes.has(productCode)) {
            toast.error(
                `Product ${productCode} is already selected. Cannot select multiple loans of the same product.`
            );
            return;
        }

        // Extract branch code from accountId
        const [branchSegment, ...accountSegments] = selectedAccountId.split("-");
        const accountSegment = accountSegments.join("-");
        const branchCode =
            branchSegment?.trim() && accountSegment.trim()
                ? branchSegment.trim()
                : "";

        // Build the loan entry
        const KNOWN_CODES: ReadonlySet<CreationTypeCode> = new Set([
            CREATION_TYPE.NEW_LOAN,
            CREATION_TYPE.RELOAN,
            CREATION_TYPE.RESTRUCTURED,
            CREATION_TYPE.ADDITIONAL_LOAN,
        ]);
        const rawCode = loan.creationType;
        const code: CreationTypeCode | null =
            rawCode != null && (KNOWN_CODES as Set<number>).has(rawCode)
                ? (rawCode as CreationTypeCode)
                : null;

        const newLoanEntry = {
            loanNo: loan.loanNo,
            productCode: productCode ?? "",
            productDescription: loan.productWithDescription ?? "",
            creationTypeCode: code,
            creationTypeLabel: loan.creationTypeLabel ?? "",
            branchCode,
            parameters: {
                product: loan.productWithDescription ?? "",
                purpose: loan.loanPurpose ?? "",
                proposedAmount: loan.principal ?? 0,
                interestRate: loan.grantedRate ?? 0,
                term: Math.round(loan.totalTermDays ?? 0),
                // Policy term from the consolidated pending-loan SQL
                // (`loan_data.total_amortization`). Distinct from `term`
                // above — see loanParametersSchema in schema.ts for the
                // policy-vs-exact distinction. Optional on the schema;
                // omitted when the pending loan had no matching
                // loan_data row (LEFT JOIN miss on the backend).
                policyTermMonths: loan.policyTermMonths ?? undefined,
                nthpDate: pendingNthpDate,
                notarialFee: 0,
                docStamps: 0,
                insurance: 0,
                standardFeesSnapshot: {
                    notarialFee: 0,
                    docStamps: 0,
                    insurance: 0,
                },
            },
        };

        append(newLoanEntry);

        // Set branchType creation type from first selected loan
        if (fields.length === 0) {
            setValue("branchType.creationTypeCode", code, { shouldDirty: false });
            setValue(
                "branchType.creationTypeLabel",
                loan.creationTypeLabel ?? "",
                { shouldDirty: false }
            );
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

                {/* Loan number picker (checkbox-style multi-select) — only after the
                    pending-loan list has been fetched. */}
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
                                Select one or more (max 1 per product)
                            </span>
                        </div>

                        <TooltipProvider>
                            <div
                                role="group"
                                aria-label="Select loan numbers"
                                className="grid gap-2"
                            >
                                {loans.map((l) => {
                                    const isSelected = fields.some(
                                        (f) => f.loanNo === l.loanNo
                                    );
                                    const productCode = extractProductCode(
                                        l.productWithDescription
                                    );
                                    // Disable if not selected AND this product is already selected
                                    const isDisabled =
                                        !isSelected &&
                                        !!productCode &&
                                        selectedProductCodes.has(productCode);

                                    return (
                                        <Tooltip key={l.loanNo}>
                                            <TooltipTrigger>
                                                <div
                                                    role="checkbox"
                                                    aria-checked={isSelected}
                                                    aria-disabled={isDisabled || undefined}
                                                    tabIndex={isDisabled ? -1 : 0}
                                                    onClick={() =>
                                                        !isDisabled && handleLoanToggle(l)
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (!isDisabled && (e.key === " " || e.key === "Enter")) {
                                                            e.preventDefault();
                                                            handleLoanToggle(l);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "group relative flex w-full items-start gap-3 rounded-md border bg-background p-3 text-left transition-all",
                                                        isSelected
                                                            ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                                                            : "border-border",
                                                        isDisabled &&
                                                            "cursor-not-allowed opacity-50"
                                                    )}
                                                >
                                                        {/* Checkbox indicator */}
                                                        <div
                                                            className={cn(
                                                                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
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
                                                                    {
                                                                        l.productWithDescription
                                                                    }
                                                                </Badge>
                                                                {l.creationTypeLabel && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px]"
                                                                    >
                                                                        {
                                                                            l.creationTypeLabel
                                                                        }
                                                                    </Badge>
                                                                )}
                                                                {l.loanPurpose && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px]"
                                                                    >
                                                                        {
                                                                            l.loanPurpose
                                                                        }
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs tabular-nums text-muted-foreground">
                                                                Proposed Balance:{" "}
                                                                <span className="font-medium text-foreground">
                                                                    ₱
                                                                    {(
                                                                        l.principal ??
                                                                        0
                                                                    ).toLocaleString()}
                                                                </span>
                                                                {" · "}
                                                                Rate:{" "}
                                                                <span className="font-medium text-foreground">
                                                                    {l.grantedRate ??
                                                                        "—"}
                                                                    %
                                                                </span>
                                                                {l.totalTermDays != null && (
                                                                    <>
                                                                        {" · "}
                                                                        Term:{" "}
                                                                        <span className="font-medium text-foreground">
                                                                            {
                                                                                l.totalTermDays
                                                                            }
                                                                            d
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {l.policyTermMonths != null && (
                                                                    <>
                                                                        {" · "}
                                                                        Policy Term:{" "}
                                                                        <span className="font-medium text-foreground">
                                                                            {
                                                                                l.policyTermMonths
                                                                            }
                                                                            mo
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </p>
                                                        </div>
                                                </div>
                                            </TooltipTrigger>
                                            {isDisabled && (
                                                <TooltipContent>
                                                    <p>
                                                        Cannot select multiple
                                                        loans of the same
                                                        product ({productCode}).
                                                    </p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </TooltipProvider>
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
                    explicit (account → loan → preloan). */}
                {selectedAccountId &&
                    hasFetched &&
                    fields.length > 0 && (
                        <>
                            <div className="my-2 border-t border-dashed" />
                        </>
                    )}
                {fields.length === 0 && selectedAccountId && hasFetched && loans.length > 0 && (
                    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
                        <Stack size={14} weight="bold" />
                        Pick one or more loan numbers above to enable preloan selection.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
