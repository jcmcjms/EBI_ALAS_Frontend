import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
    ArrowCounterClockwise,
    CheckCircle,
    CircleNotch,
    IdentificationBadge,
    Info,
    Stack,
    WarningCircle,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import { getErrorMessage } from "@/src/lib/apiClient";
import { getPreLoans } from "@/src/lib/api/webloans";
import { WEBLOAN_BRANCHES, type PreLoanItem } from "@/src/lib/api/types";

interface PreLoanPickerProps {
    /** CIS number from the loaded borrower. */
    cisNo: string;
    /** Account number currently selected in the parent (ActiveLoansTable) picker. */
    accountNo: string;
    /**
     * The acting user's branch code (auth.user.branchId). The backend re-asserts
     * this server-side on every request; the value here is used **only** to
     * label the section and to make the bch scoping visible to the user.
     */
    userBranchId: string;
    /**
     * Currently selected preloan id. Controlled by the parent so the form
     * state can be reset on "Change client" / "Change account".
     */
    value: string;
    onChange: (id: string, preloan: PreLoanItem | null) => void;
    /**
     * Total count of preloans across all of the borrower's accounts — shown
     * as a "you're filtering to account X" hint so the AO understands the
     * scope.
     */
    totalForCis?: number;
}

/**
 * PreLoanPicker — step 3 of the loan-creation wizard.
 *
 * Once a CIS profile is loaded (step 1) and an account is chosen (step 2),
 * the AO picks the specific preloan (i.e. in-progress application) they
 * want to resume / attach this new loan to.
 *
 * **Scoping rules — bch must equal the acting user's branch**
 * - The backend filters `preloan.bch == JWT.user.branchId` on every request.
 * - The frontend never filters by branch itself; it only passes through the
 *   (cisNo, accountNo) pair it already has from the lookup.
 * - The chip on the picker header makes that scope visible so the AO never
 *   wonders "why am I not seeing X?".
 *
 * The component owns the (loading / error / data) state; the parent owns the
 * selected id so it can be reset together with the rest of the form.
 *
 * The parent is expected to remount this component (via React `key`) when
 * the (cisNo, accountNo) pair changes — see `ActiveLoansTable`. That keeps
 * the picker stateless across navigations and avoids effect-driven state
 * resets that would cascade-render.
 */
export function PreLoanPicker({
    cisNo,
    accountNo,
    userBranchId,
    value,
    onChange,
    totalForCis,
}: PreLoanPickerProps) {
    const [preLoans, setPreLoans] = useState<PreLoanItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    // Resolve "000" → "Lianga Branch" for the scope chip.
    const branchName =
        WEBLOAN_BRANCHES.find((b) => b.code === userBranchId)?.name ??
        userBranchId;

    // Auto-fetch the first time we have a valid (cis, account) pair — mirrors
    // the pattern in ActiveLoansTable so the AO lands directly on a populated list.
    // Guarded by `hasFetched` to keep this from looping.
    useEffect(() => {
        if (!cisNo || !accountNo) return;
        if (hasFetched || isLoading) return;
        // Inline fetch — we intentionally do NOT depend on `handleFetch` so
        // the effect runs exactly once per mount. The remount (via React key)
        // guarantees fresh data whenever the (cis, account) pair changes.
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await getPreLoans({ cisNo, accountNo });
                if (cancelled) return;
                setPreLoans(result.preLoans ?? []);
                setHasFetched(true);
            } catch (err) {
                if (cancelled) return;
                // 404 ⇒ no preloans for this (cis, account) — not an error, just empty.
                const message = getErrorMessage(err);
                setPreLoans([]);
                setHasFetched(true);
                setError(message);
                toast.error(message);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cisNo, accountNo]);

    const handleRefresh = async () => {
        if (!cisNo || !accountNo || isLoading) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await getPreLoans({ cisNo, accountNo });
            setPreLoans(result.preLoans ?? []);
            setHasFetched(true);
        } catch (err) {
            const message = getErrorMessage(err);
            setPreLoans([]);
            setHasFetched(true);
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section
            aria-label="Preloan selection"
            className="space-y-3"
        >
            {/* ── Header strip with scope chip ─────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Preloan
                    </h4>
                    <Badge
                        variant="outline"
                        className="gap-1 border-primary/30 bg-primary/5 py-0.5 font-mono text-[10px] text-primary"
                    >
                        <IdentificationBadge size={12} weight="bold" />
                        bch {userBranchId} · {branchName}
                    </Badge>
                </div>
                {typeof totalForCis === "number" && totalForCis > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                        {totalForCis} preloan{totalForCis === 1 ? "" : "s"} across all accounts
                    </span>
                )}
            </div>

            {/* ── Helper explainer ──────────────────────────────────────── */}
            <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <Info size={14} weight="bold" className="mt-0.5 shrink-0" />
                <span>
                    Only preloans whose <span className="font-mono">bch</span> matches
                    your branch (<span className="font-mono">{userBranchId}</span>) are
                    shown. Pick one to attach this new application to its existing
                    account.
                </span>
            </div>

            {/* ── Loading skeleton ──────────────────────────────────────── */}
            {isLoading && (
                <div
                    className="space-y-2 rounded-md border bg-muted/20 p-3"
                    aria-busy="true"
                    aria-label="Loading preloans"
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

            {/* ── Inline error ──────────────────────────────────────────── */}
            {error && !isLoading && (
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
                            <p className="font-medium">Unable to load preloans</p>
                            <p className="text-xs opacity-90">{error}</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 gap-1.5 text-destructive"
                        onClick={handleRefresh}
                    >
                        <ArrowCounterClockwise size={14} weight="bold" />
                        Retry
                    </Button>
                </div>
            )}

            {/* ── Empty success state ───────────────────────────────────── */}
            {!isLoading && hasFetched && preLoans.length === 0 && !error && (
                <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
                    <Stack size={14} weight="bold" />
                    No preloans for account <span className="font-mono">{accountNo}</span>{" "}
                    under your branch ({userBranchId}).
                </div>
            )}

            {/* ── Populated list — radio-style cards ───────────────────── */}
            {!isLoading && hasFetched && preLoans.length > 0 && (
                <div
                    role="radiogroup"
                    aria-label="Select a preloan"
                    className="grid gap-2"
                >
                    {preLoans.map((p) => {
                        const isSelected = value === String(p.id);
                        return (
                            <button
                                key={p.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => onChange(String(p.id), p)}
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
                                            #{p.id}
                                        </span>
                                        {p.formNumber && (
                                            <Badge variant="secondary" className="font-mono text-[10px]">
                                                {p.formNumber}
                                            </Badge>
                                        )}
                                        {p.productDescription && (
                                            <Badge variant="outline" className="text-[10px]">
                                                {p.productDescription}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Last edited{" "}
                                        <span className="font-medium text-foreground">
                                            {new Date(p.lastModifiedAt).toLocaleString()}
                                        </span>
                                        {p.lastModifiedBy && (
                                            <>
                                                {" by "}
                                                <span className="font-medium text-foreground">
                                                    {p.lastModifiedBy}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                    {typeof p.proposedAmount === "number" &&
                                        p.proposedAmount > 0 && (
                                            <p className="text-xs tabular-nums text-muted-foreground">
                                                ₱
                                                {p.proposedAmount.toLocaleString()} ·{" "}
                                                {p.termMonths ?? "—"} mo ·{" "}
                                                {p.interestRate ?? "—"}% ·{" "}
                                                <span className="italic">
                                                    {p.purpose ?? "—"}
                                                </span>
                                            </p>
                                        )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Refresh hint after a successful fetch ─────────────────── */}
            {!isLoading && hasFetched && preLoans.length > 0 && (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        className="h-7 gap-1.5 text-xs text-muted-foreground"
                    >
                        <ArrowCounterClockwise size={12} weight="bold" />
                        Refresh
                    </Button>
                </div>
            )}
        </section>
    );
}