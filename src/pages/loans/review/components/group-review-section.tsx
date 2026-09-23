import { useMemo, useState } from "react";
import { CaretRight, Eye, Stack } from "@phosphor-icons/react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/src/components/ui/dialog";
import { Textarea } from "@/src/components/ui/textarea";
import { toastSuccess, toastWarning } from "@/src/components/ui/toast";
import { cn } from "@/src/lib/utils";
import { useLoanGroup, useUpdateGroupStatus } from "@/src/hooks/use-loan-group";
import type { GroupLoanResult, GroupStatusResponse } from "@/src/lib/api/loan-groups";

interface Props {
    groupNo: string;
    currentLoanId: number;
    /** Target statuses the acting role may move the CURRENT loan to. */
    allowedTargets: string[];
    statusOf: (status: string) => string;
    /** Row click → open that loan's review (parent navigates). */
    onSelectLoan?: (loanId: number) => void;
}

export function GroupReviewSection({
    groupNo,
    currentLoanId,
    allowedTargets,
    statusOf,
    onSelectLoan,
}: Props) {
    const group = useLoanGroup(groupNo);
    const update = useUpdateGroupStatus();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [target, setTarget] = useState<string | null>(null);
    const [comments, setComments] = useState("");
    const [picked, setPicked] = useState<Record<number, boolean>>({});
    const [results, setResults] = useState<GroupStatusResponse | null>(null);

    const loans = group.data?.loans ?? [];
    // Loans in the group other than the one currently open — the section is hidden
    // when the group has only one loan.
    const siblings = useMemo(
        () => loans.filter((l) => l.id !== currentLoanId),
        [loans, currentLoanId]
    );

    const currentLoanStatus = useMemo(
        () => loans.find((l) => l.id === currentLoanId)?.status,
        [loans, currentLoanId]
    );

    // UX-only pre-filter: server re-validates every loan independently.
    const eligibility = useMemo(
        () =>
            loans.map((l) => {
                const reasons: string[] = [];
                if (!target || !allowedTargets.includes(target))
                    reasons.push("decision not set");
                else if (l.status !== currentLoanStatus)
                    reasons.push(`status is ${statusOf(l.status)}`);
                if (l.unresolvedDocs > 0 && target === "ForApproval")
                    reasons.push(`${l.unresolvedDocs} unresolved doc(s)`);
                return { loan: l, eligible: reasons.length === 0, reasons };
            }),
        [loans, target, currentLoanStatus, allowedTargets, statusOf]
    );

    if (siblings.length === 0) return null;

    const openDialog = (t: string) => {
        setTarget(t);
        setResults(null);
        setComments("");
        // Pre-select only loans currently in the same status as the open one —
        // the server rejects cross-status bundle moves.
        setPicked(
            Object.fromEntries(
                loans
                    .filter((l) => l.status === currentLoanStatus)
                    .map((l) => [l.id, true])
            )
        );
        setDialogOpen(true);
    };

    const confirm = () => {
        const ids = eligibility
            .filter((e) => e.eligible && picked[e.loan.id])
            .map((e) => e.loan.id);
        if (ids.length === 0 || !target) return;
        update.mutate(
            {
                groupNo,
                payload: {
                    status: target,
                    comments: comments.trim() || undefined,
                    loanIds: ids,
                },
            },
            {
                onSuccess: (r) => {
                    setResults(r);
                    if (r.failed === 0)
                        toastSuccess(`Decision applied to ${r.succeeded} loan(s)`);
                    else
                        toastWarning(
                            `Applied to ${r.succeeded}; ${r.failed} loan(s) rejected by server rules`
                        );
                },
            }
        );
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Stack
                        className="size-5 text-muted-foreground"
                        aria-hidden
                    />
                    Application group{" "}
                    <span className="font-mono text-base">{groupNo}</span>
                    <Badge variant="secondary" className="tabular-nums">
                        {loans.length}
                    </Badge>
                </CardTitle>
                <div className="flex gap-2">
                    {allowedTargets.map((t) => (
                        <Button
                            key={t}
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(t)}
                        >
                            Review bundle: {statusOf(t)}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardDescription className="px-6 pt-1 text-xs">
                Select a loan to open its review. Bundle actions apply one decision to every eligible loan.
            </CardDescription>
            <CardContent>
                <ul className="divide-y rounded-md border">
                    {loans.map((l) => (
                        <li
                            key={l.id}
                            className={cn(
                                "group/row",
                                l.id === currentLoanId && "bg-primary/[0.04]"
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => onSelectLoan?.(l.id)}
                                aria-current={l.id === currentLoanId ? "page" : undefined}
                                title={`Open ${l.lamId}`}
                                className={cn(
                                    "flex w-full items-center gap-3 p-3 text-left transition-colors",
                                    "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                )}
                            >
                                <span className="flex-1 truncate font-mono text-sm">{l.lamId}</span>
                                <span className="w-24 truncate text-sm text-muted-foreground">
                                    {l.productCode}
                                </span>
                                {l.unresolvedDocs > 0 && (
                                    <Badge variant="outline" className="font-normal text-amber-600 dark:text-amber-400">
                                        {l.unresolvedDocs} doc(s) open
                                    </Badge>
                                )}
                                <Badge variant="outline" className="font-normal">{statusOf(l.status)}</Badge>
                                {l.id === currentLoanId ? (
                                    <Badge variant="secondary" className="gap-1">
                                        <Eye size={12} weight="bold" /> viewing
                                    </Badge>
                                ) : (
                                    <CaretRight
                                        size={14}
                                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100"
                                        aria-hidden
                                    />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                Apply &ldquo;{target ? statusOf(target) : ""}&rdquo;
                                to the bundle
                            </DialogTitle>
                            <DialogDescription>
                                Each loan is validated independently (state machine,
                                queue turn, document completeness). Loans that fail
                                stay untouched and are listed in the result.
                            </DialogDescription>
                        </DialogHeader>

                        {!results ? (
                            <>
                                <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                    {eligibility.map(
                                        ({ loan, eligible, reasons }) => (
                                            <li
                                                key={loan.id}
                                                className="flex items-start gap-2"
                                            >
                                                <Checkbox
                                                    id={`g-${loan.id}`}
                                                    checked={
                                                        !!picked[loan.id] &&
                                                        eligible
                                                    }
                                                    disabled={
                                                        !eligible ||
                                                        update.isPending
                                                    }
                                                    onCheckedChange={(v) =>
                                                        setPicked((p) => ({
                                                            ...p,
                                                            [loan.id]:
                                                                v === true,
                                                        }))
                                                    }
                                                />
                                                <label
                                                    htmlFor={`g-${loan.id}`}
                                                    className={cn(
                                                        "flex-1 text-sm",
                                                        !eligible &&
                                                            "text-muted-foreground"
                                                    )}
                                                >
                                                    <span className="font-mono">
                                                        {loan.lamId}
                                                    </span>
                                                    {!eligible && (
                                                        <span className="block text-xs">
                                                            Not eligible:{" "}
                                                            {reasons.join("; ")}
                                                        </span>
                                                    )}
                                                </label>
                                            </li>
                                        )
                                    )}
                                </ul>
                                <Textarea
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Comments (written to each loan's audit trail)..."
                                    value={comments}
                                    onChange={(e) =>
                                        setComments(e.target.value)
                                    }
                                />
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                        disabled={update.isPending}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={confirm}
                                        disabled={
                                            update.isPending ||
                                            !eligibility.some(
                                                (e) =>
                                                    e.eligible &&
                                                    picked[e.loan.id]
                                            )
                                        }
                                    >
                                        {update.isPending
                                            ? "Applying..."
                                            : "Apply decision"}
                                    </Button>
                                </DialogFooter>
                            </>
                        ) : (
                            <>
                                <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                                    {results.results.map(
                                        (r: GroupLoanResult) => (
                                            <li
                                                key={r.loanId}
                                                className="flex items-center gap-2"
                                            >
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "font-normal",
                                                        r.succeeded
                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                            : "text-red-600 dark:text-red-400"
                                                    )}
                                                >
                                                    {r.succeeded
                                                        ? "applied"
                                                        : "rejected"}
                                                </Badge>
                                                <span className="font-mono">
                                                    {r.lamId}
                                                </span>
                                                {r.error && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {r.error}
                                                    </span>
                                                )}
                                            </li>
                                        )
                                    )}
                                </ul>
                                <DialogFooter>
                                    <Button
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        Done
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
