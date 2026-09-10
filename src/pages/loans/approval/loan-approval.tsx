import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { Spinner } from "@/src/components/ui/spinner";
import {
    CheckCircle,
    XCircle,
    ArrowRight,
    ArrowCounterClockwise,
    FilePdf,
    Printer,
    Clock,
    UserCircle,
    WarningCircle,
    ArrowLeft,
} from "@phosphor-icons/react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/src/components/ui/alert-dialog";
import { toast } from "sonner";

import { useAuthStore } from "@/src/store/authStore";
import { ApprovalFormDocument } from "./components/approval-form-document";
import {
    getLoanById,
    getLoanHistory,
    updateLoanStatus,
    type LoanResponse,
    type LoanHistoryEntry,
} from "@/src/lib/api/loans";
import { queryKeys } from "@/src/lib/queryKeys";
import type { LoanApplicationFormData } from "../create/schema";
import { CREATION_TYPE, type DeviationReason } from "../create/schema";

/**
 * Shape the flattened `LoanResponse` (returned by `GET /api/loans/{id}`) into
 * the nested `LoanApplicationFormData` shape the existing
 * `ApprovalFormDocument` consumes.
 *
 * ## Why a mapping function?
 *
 * The backend returns a SINGLE denormalized object — borrower snapshot +
 * loan core + outstanding obligations + EBI / buy-out / incoming lists +
 * audit actions all joined onto the row. The form, however, was designed
 * before the backend was extended to carry the full loan core; it expects
 * the nested shape the wizard builds during submission. Rather than
 * refactor the printed form to read the flat response directly (a wide
 * blast radius for a print-only component), we adapt at the page edge
 * with this mapper. The component itself remains untouched.
 *
 * ## Null-safety
 *
 * The backend marks every optional field as nullable on the wire. The
 * mapper coerces every `undefined` to its empty-equivalent (`""` / `0` /
 * `[]` / `{}`) so the form never renders `undefined` and the .strictNullChecks
 * schema accepts the result.
 *
 * ## What about `agency`?
 *
 * The `clientSchema` requires `agency: z.string().min(1)`. The backend
 * returns `agency?: string` and we may receive an empty string here; the
 * mapper passes through whatever the backend sent and lets the form render
 * a dash. This mirrors the wizard's behavior for missing agency data and
 * keeps the printout honest rather than fabricating a placeholder.
 */
function mapLoanToFormData(loan: LoanResponse): LoanApplicationFormData {
    // `creationTypeCode` arrives as a loose `number` from the backend but the
    // schema's `creationTypeCodeSchema` is the closed union `0 | 1 | 2 | 6 | null`.
    // We narrow at the boundary so anything that does not match the four
    // documented creation-type codes (incl. null/missing) falls back to
    // `CREATION_TYPE.NEW_LOAN` — the wizard's "no preloan picked yet" default.
    // Anything outside that set would be a backend bug; falling back keeps
    // the printout legible instead of failing the page render.
    const creationTypeCode: 0 | 1 | 2 | 6 =
        loan.creationTypeCode === CREATION_TYPE.RELOAN
            ? CREATION_TYPE.RELOAN
            : loan.creationTypeCode === CREATION_TYPE.RESTRUCTURED
            ? CREATION_TYPE.RESTRUCTURED
            : loan.creationTypeCode === CREATION_TYPE.ADDITIONAL_LOAN
            ? CREATION_TYPE.ADDITIONAL_LOAN
            : CREATION_TYPE.NEW_LOAN;

    // `deviationDetails` from the backend is a free `string[]`; the schema's
    // `deviationDetails` is the closed union of `DEVIATION_REASONS`. We filter
    // down to known reasons here — anything outside the catalogue is dropped
    // so the form's enum-typed field stays well-formed. (An empty result is
    // a valid state when no deviations were selected.)
    const deviationDetails: DeviationReason[] = (loan.deviationDetails ?? []).filter(
        (reason): reason is DeviationReason =>
            typeof reason === "string" &&
            (reason === "Age not within the prescribed parameters" ||
                reason === "Discounted Application Fee" ||
                reason === "Interest rate reduction" ||
                reason === "Lacking bank statement of account" ||
                reason === "Lacking CIBI" ||
                reason === "Lacking marriage cert. with surname as single" ||
                reason === "Lacking one or two payslip(s) for new atm loan" ||
                reason === "Lacking signature in application form" ||
                reason === "Lacking SPAs to claim ATM" ||
                reason === "No appointment record and/or service record" ||
                reason === "No FI SOA and loan ledger" ||
                reason === "No latest payslip" ||
                reason === "No interview sheet" ||
                reason === "No orientation form or old form submitted" ||
                reason === "No valid identification cards" ||
                reason ===
                    "Total consumer loan exposure exceeding 1.2 million" ||
                reason === "With blocked ATIM in same school" ||
                reason ===
                    "With history of delinquency in the latest loan availment" ||
                reason === "With NFIS findings" ||
                reason === "With past due account - non performing loan" ||
                reason === "With past due account - performing")
    );

    return {
        branchType: {
            creationTypeCode,
            creationTypeLabel: loan.creationTypeLabel ?? "New Loan",
            branch: loan.branchCode,
            requestingOfficer: loan.requestingOfficer ?? "",
            lai: loan.lai ?? loan.lamId,
        },
        client: {
            // `agency` is required (`.min(1)`) on the schema. The backend
            // marks it optional; when it's missing we hand the form an empty
            // string and let the printed form render "-" via its `dash()`
            // helper. Same shape as `dummy-data.ts` (which uses an explicit
            // non-empty placeholder).
            cisId: loan.cisId ?? "",
            firstName: loan.firstName,
            middleName: loan.middleName,
            lastName: loan.lastName,
            suffix: loan.suffix,
            birthdate: loan.birthdate,
            address: loan.address,
            agency: loan.agency ?? "",
            position: loan.position,
            employeeId: loan.employeeId,
            netTakeHomePay: loan.netTakeHomePay ?? 0,
            lengthOfService: loan.lengthOfService,
            region: loan.region,
            divisionCode: loan.divisionCode,
            stationCode: loan.stationCode,
            misAgency: loan.misAgency,
            school: loan.school,
            referrer: loan.referrer,
        },
        loan: {
            product: loan.product,
            purpose: loan.purpose ?? "",
            proposedAmount: loan.proposedAmount,
            term: loan.termDays,
            interestRate: loan.interestRate,
            nthpDate: loan.nthpDate,
        },
        outstandingLoans: loan.outstandingLoans.map((o) => ({
            pn: o.pn,
            principalBalance: o.principalBalance,
            amortization: o.amortization,
            outstandingBalance: o.outstandingBalance,
            dateGranted: o.dateGranted,
            dateMaturity: o.dateMaturity,
            status: o.status,
        })),
        ebiReloans: loan.ebiReloans.map((e) => ({
            pn: e.pn,
            name: e.name,
            existingDeduction: e.existingDeduction,
            outstandingBalance: e.outstandingBalance,
            payToClose: e.payToClose,
        })),
        buyOuts: loan.buyOuts.map((b) => ({
            pn: b.pn,
            name: b.name,
            amortization: b.amortization,
            outstandingBalance: b.outstandingBalance,
        })),
        incomingLoans: loan.incomingLoans.map((i) => ({
            name: i.name,
            deductions: i.deductions,
            remarks: i.remarks,
        })),
        verification: {
            findings: loan.verificationFindings ?? "",
        },
        deviations: {
            hasDeviations: loan.hasDeviations,
            deviationDetails,
            deviationJustifications: loan.deviationJustifications ?? {},
            remarks: loan.remarks,
            aoRecommendation: loan.aoRecommendation,
            // `otherRemarks` is required by the schema (`min(1)`). Same
            // null-safety pattern as `agency` above: default to empty string
            // when the backend didn't capture one (older loans / drafts
            // predating the field).
            otherRemarks: loan.otherRemarks ?? "",
            feeDeviationJustification: loan.feeDeviationJustification,
        },
        // ── Schema-cast note ──────────────────────────────────────────────
        //
        // The cast below exists because the wizard's schema was reshaped to
        // carry an ARRAY of selected loans (`loans: z.array(selectedLoanSchema)`)
        // but the printed form (`ApprovalFormDocument`) still reads the
        // legacy single-loan shape (`data.loan`). The spec for this task
        // intentionally keeps the singular `loan` field so the print-only
        // component doesn't have to change — the mapper translates the
        // flat backend response into the form's expected nested shape.
        //
        // This mirrors the existing pre-change pattern in `dummy-data.ts`
        // (which also declares `loan: { ... }` on a `LoanApplicationFormData`
        // and accepts the same TS warning). The runtime payload is correct;
        // the type-system mismatch is contained to this mapper. A future
        // task that consolidates the schema + printout would let us drop
        // the cast.
    } as unknown as LoanApplicationFormData;
}

/**
 * Loan Review & Approval page (Task 11).
 *
 * ## Entry
 *
 * Users land here from the monitoring page's "Review & Process Application"
 * drawer button (see `LoanDetailsDrawer`). The numeric `LoanApplication.Id`
 * arrives via `?id=` so we read it with `useSearchParams` rather than a
 * route param — that keeps the existing `/loans/approval` route shape and
 * avoids a parent refactor for callers that pass `id=` in the search params.
 *
 * ## Data
 *
 * Two server calls fire in parallel:
 *   1. `GET /api/loans/{id}`           → `LoanResponse` (form document).
 *   2. `GET /api/loans/{id}/history`   → `LoanHistoryEntry[]` (audit trail).
 *
 * Both honor `enabled: Number.isFinite(applicationId) && applicationId > 0`
 * so React Query doesn't fire when the URL is missing `?id=...` (the page's
 * first empty-state branch handles that case with a "Return to Monitoring"
 * button before either hook runs).
 *
 * ## Workflow
 *
 * `PUT /api/loans/{id}/status` carries `{ status, comments }`. The backend's
 * `LoanWorkflowService.IsValidTransition` is the authoritative role gate —
 * it checks BOTH the (current → target) edge AND the actor's role against
 * the workflow matrix. The page UI mirrors that logic so a user never sees
 * a button that 409s, but we trust the backend to refuse anything illegal
 * (e.g. a stale status from a concurrent transition).
 *
 * On success we invalidate `queryKeys.loans.all` so the monitoring table
 * refetches with the new status without a manual reload, then navigate back
 * to `/loans/monitoring` (the natural return point — the user just acted
 * on a row they were looking at).
 */
export function LoanApprovalPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const applicationId = Number(searchParams.get("id"));

    const [remarks, setRemarks] = useState("");

    const authUser = useAuthStore((s) => s.user);
    const userRole = authUser?.role;
    const fullNameOfUser = authUser
        ? [authUser.firstName, authUser.middleName, authUser.lastName]
              .filter(Boolean)
              .join(" ")
        : "Unknown Approver";

    // ── Data fetching ────────────────────────────────────────────────────────
    // `Number.isFinite` excludes NaN (when `?id=` is missing or non-numeric)
    // and Infinity; the positive guard catches id=0 / negative ids that would
    // otherwise pass `isFinite` but hit a 404 on the backend.
    const loanQuery = useQuery({
        queryKey: ["loan", applicationId],
        queryFn: () => getLoanById(applicationId),
        enabled: Number.isFinite(applicationId) && applicationId > 0,
    });

    const historyQuery = useQuery({
        queryKey: ["loanHistory", applicationId],
        queryFn: () => getLoanHistory(applicationId),
        enabled: Number.isFinite(applicationId) && applicationId > 0,
    });

    // ── Workflow mutation ────────────────────────────────────────────────────
    // On success: invalidate every loan-related query (broadest prefix =
    // monitoring list, admin lists, future detail views) and bounce back to
    // the monitoring page — the user just acted on a row there.
    //
    // On error: surface the backend's `ApiResponse.message` if present (this
    // is what the role/transition-denied endpoints return); fall back to a
    // generic "Failed to update status" so a network error isn't a dead-end.
    const statusMutation = useMutation({
        mutationFn: (payload: { status: string; comments?: string }) =>
            updateLoanStatus(applicationId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
            toast.success("Status updated successfully");
            navigate("/loans/monitoring");
        },
        onError: (err: unknown) => {
            const e = err as { response?: { data?: { message?: string } } };
            const message = e?.response?.data?.message || "Failed to update status";
            toast.error(message);
        },
    });

    // `useMemo` keeps the mapper's allocation off React Query's render path —
    // we only re-build the form payload when the loan row actually changes
    // (status transitions, polling refresh, etc.), not on every keystroke in
    // the remarks textarea.
    const loanData = useMemo(
        () => (loanQuery.data ? mapLoanToFormData(loanQuery.data) : null),
        [loanQuery.data]
    );
    const currentStatus = loanQuery.data?.status;
    const lai = loanData?.branchType.lai || "Pending...";

    // ── Role-based UI gating ─────────────────────────────────────────────────
    // Mirrors the backend's workflow matrix:
    //   ForRecommendation  → Recommender (or Admin) → "Recommend for Evaluation"
    //   ForChecking        → Evaluator   (or Admin) → "Evaluate for Approval"
    //   ForApproval        → Approver    (or Admin) → "Approve" / "Reject" / "Return"
    //
    // The backend re-validates these checks; the UI mirroring is purely a UX
    // optimization so the user never sees a button they can't press.
    const canRecommend =
        currentStatus === "ForRecommendation" &&
        (userRole === "Recommender" || userRole === "Admin");
    const canEvaluate =
        currentStatus === "ForChecking" &&
        (userRole === "Evaluator" || userRole === "Admin");
    const canApprove =
        currentStatus === "ForApproval" &&
        (userRole === "Approver" || userRole === "Admin");

    const canAct =
        (canRecommend || canEvaluate || canApprove) &&
        remarks.trim().length > 0 &&
        !statusMutation.isPending;

    /**
     * Map a UI action intent ("recommend", "evaluate", "approve", "reject",
     * "revision") to the backend status string. The backend's
     * `LoanWorkflowService` re-validates the transition; this table is the
     * client-side mirror so we don't need to think about target statuses
     * anywhere else in the file.
     */
    const handleAction = (
        action: "recommend" | "evaluate" | "approve" | "reject" | "revision"
    ) => {
        if (!remarks.trim()) {
            toast.error("Remarks are required.");
            return;
        }
        const statusMap: Record<typeof action, string> = {
            recommend: "ForChecking",
            evaluate: "ForApproval",
            approve: "Approved",
            reject: "Rejected",
            revision: "ForRevision",
        };
        statusMutation.mutate({ status: statusMap[action], comments: remarks });
    };

    // ── Empty / error states ─────────────────────────────────────────────────
    // Guard 1: missing or malformed `?id=`. We bounce back to monitoring —
    // there's nothing to render without a loan id.
    if (!Number.isFinite(applicationId) || applicationId <= 0) {
        return (
            <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
                <div className="text-center space-y-4">
                    <WarningCircle
                        size={48}
                        className="mx-auto text-destructive"
                    />
                    <h2 className="text-xl font-semibold">Invalid Application ID</h2>
                    <Button onClick={() => navigate("/loans/monitoring")}>
                        Return to Monitoring
                    </Button>
                </div>
            </div>
        );
    }

    // Guard 2: still fetching.
    if (loanQuery.isLoading) {
        return (
            <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
                <Spinner className="size-8" />
            </div>
        );
    }

    // Guard 3: load failed (404 not-found, 403 no access, or any other error)
    // OR succeeded but mapping yielded nothing (defensive — shouldn't happen).
    if (loanQuery.isError || !loanData) {
        return (
            <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
                <div className="text-center space-y-4">
                    <WarningCircle
                        size={48}
                        className="mx-auto text-destructive"
                    />
                    <h2 className="text-xl font-semibold">
                        Failed to Load Application
                    </h2>
                    <Button onClick={() => navigate("/loans/monitoring")}>
                        Return to Monitoring
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">
            {/* ── Sticky header ──────────────────────────────────────────────── */}
            <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate("/loans/monitoring")}
                            aria-label="Back to monitoring"
                        >
                            <ArrowLeft size={18} weight="bold" />
                        </Button>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Loan Review &amp; Approval
                        </h1>
                        <Badge variant="outline" className="text-xs">
                            {lai}
                        </Badge>
                        <Badge
                            variant="secondary"
                            className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700"
                        >
                            <Clock size={12} weight="fill" />
                            {currentStatus}
                        </Badge>
                    </div>
                    <Badge
                        variant="outline"
                        className="gap-1.5 font-normal"
                    >
                        <UserCircle size={14} />
                        {fullNameOfUser} ({userRole})
                    </Badge>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,380px]">
                    {/* ── Main document ──────────────────────────────────────── */}
                    <div className="space-y-4">
                        <Card className="overflow-hidden">
                            <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 p-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FilePdf
                                        size={20}
                                        weight="bold"
                                        className="text-primary"
                                    />
                                    Approval Form Document
                                </CardTitle>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={14} weight="bold" />
                                    Print
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* `catLoanClass` is null here — the page-level
                                 * resolver (`useCatLoanClass`) was tied to the
                                 * selected preloan's (bch, loanNo, product)
                                 * tuple. Once the backend's `LoanResponse`
                                 * carries `loan_data.cat_loan_class` (or a
                                 * similar product-class field), wire it
                                 * through here. */}
                                <ApprovalFormDocument
                                    data={loanData}
                                    catLoanClass={null}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Sticky workflow sidebar ─────────────────────────────── */}
                    <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit lg:self-start">
                        <Card>
                            <CardHeader className="border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <CheckCircle
                                        size={18}
                                        weight="bold"
                                        className="text-primary"
                                    />
                                    Workflow Actions
                                </CardTitle>
                                <CardDescription className="pt-1 text-xs">
                                    Review details and route to the next step.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                {/* ── Audit Trail ─────────────────────────────────
                                 * Pulled from `GET /api/loans/{id}/history`.
                                 * The backend's `LoanHistoryEntry.action` is a
                                 * free-form verb (e.g. "Created", "Recommended",
                                 * "Approved"); `toStatus` is the resulting
                                 * workflow status. We render the most recent
                                 * row (where `toStatus === currentStatus`) with
                                 * a blue arrow to show "this is where you are
                                 * now", and historical rows with a green check
                                 * to show the trail that got us here.
                                 */}
                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <Clock size={12} />
                                        Audit Trail
                                    </h3>
                                    {historyQuery.isLoading ? (
                                        <div className="flex justify-center py-4">
                                            <Spinner className="size-5" />
                                        </div>
                                    ) : (
                                        <ul className="space-y-3 text-xs">
                                            {(historyQuery.data || []).map(
                                                (action: LoanHistoryEntry) => (
                                                    <li
                                                        key={action.id}
                                                        className="flex gap-3"
                                                    >
                                                        {action.toStatus ===
                                                        currentStatus ? (
                                                            <ArrowRight
                                                                size={16}
                                                                className="mt-0.5 shrink-0 text-blue-500"
                                                                weight="bold"
                                                            />
                                                        ) : (
                                                            <CheckCircle
                                                                size={16}
                                                                className="mt-0.5 shrink-0 text-primary"
                                                                weight="fill"
                                                            />
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="font-medium text-foreground">
                                                                {action.actionBy}{" "}
                                                                (
                                                                {action.action}
                                                                )
                                                            </p>
                                                            <p className="text-muted-foreground">
                                                                {action.fromStatus &&
                                                                action.toStatus
                                                                    ? `${action.fromStatus} → ${action.toStatus}`
                                                                    : action.action}{" "}
                                                                •{" "}
                                                                {new Date(
                                                                    action.actionDate
                                                                ).toLocaleString()}
                                                            </p>
                                                            {action.comments && (
                                                                <p className="mt-1 border-l-2 border-border pl-2 italic text-muted-foreground">
                                                                    &ldquo;
                                                                    {
                                                                        action.comments
                                                                    }
                                                                    &rdquo;
                                                                </p>
                                                            )}
                                                        </div>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    )}
                                </div>

                                <div className="h-px bg-border" />

                                {/* ── Remarks ───────────────────────────────────
                                 * Required: the backend re-validates this and
                                 * 400s on an empty `comments` for any workflow
                                 * transition. We also block the mutation
                                 * client-side so the user gets an instant
                                 * "Remarks are required" toast instead of
                                 * waiting on a round-trip. */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="remarks"
                                        className="flex items-center gap-1.5 text-sm font-semibold"
                                    >
                                        Remarks / Conditions
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="remarks"
                                        placeholder="Enter comments..."
                                        value={remarks}
                                        onChange={(e) =>
                                            setRemarks(e.target.value)
                                        }
                                        className="min-h-[100px] resize-none text-sm"
                                        disabled={statusMutation.isPending}
                                    />
                                    {remarks.trim().length === 0 && (
                                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <WarningCircle
                                                size={12}
                                                weight="fill"
                                            />
                                            Required to take workflow action
                                        </p>
                                    )}
                                </div>

                                {/* ── Action buttons ────────────────────────────
                                 * Each button is gated on BOTH:
                                 *   1. The loan's current status matches the
                                 *      workflow step the button represents
                                 *      (so a stale page render doesn't show
                                 *      "Approve" on a `ForRecommendation`
                                 *      loan), AND
                                 *   2. The actor's role is allowed to perform
                                 *      that step (mirroring the backend
                                 *      workflow matrix).
                                 *
                                 * `canAct` further requires non-empty remarks
                                 * and an idle mutation — once the user clicks,
                                 * every button is disabled until the round
                                 * trip resolves (success → navigate, failure →
                                 * toast, idle → re-enabled). */}
                                <div className="space-y-2">
                                    {canApprove && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant="outline"
                                                className="gap-2"
                                                onClick={() =>
                                                    handleAction("revision")
                                                }
                                                disabled={!canAct}
                                            >
                                                <ArrowCounterClockwise
                                                    size={16}
                                                />
                                                Return
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger
                                                    render={
                                                        <Button
                                                            variant="destructive"
                                                            className="gap-2"
                                                            disabled={!canAct}
                                                        />
                                                    }
                                                >
                                                    <XCircle size={16} />
                                                    Reject
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            Reject this
                                                            application?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will terminate
                                                            the loan process
                                                            and notify the
                                                            encoder.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel
                                                            disabled={
                                                                statusMutation.isPending
                                                            }
                                                        >
                                                            Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() =>
                                                                handleAction(
                                                                    "reject"
                                                                )
                                                            }
                                                            disabled={
                                                                statusMutation.isPending
                                                            }
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Confirm Rejection
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}

                                    {canRecommend && (
                                        <Button
                                            className="w-full gap-2"
                                            size="lg"
                                            onClick={() =>
                                                handleAction("recommend")
                                            }
                                            disabled={!canAct}
                                        >
                                            {statusMutation.isPending ? (
                                                "Processing..."
                                            ) : (
                                                <>
                                                    <ArrowRight
                                                        size={18}
                                                        weight="bold"
                                                    />
                                                    Recommend for Evaluation
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {canEvaluate && (
                                        <Button
                                            className="w-full gap-2"
                                            size="lg"
                                            onClick={() =>
                                                handleAction("evaluate")
                                            }
                                            disabled={!canAct}
                                        >
                                            {statusMutation.isPending ? (
                                                "Processing..."
                                            ) : (
                                                <>
                                                    <ArrowRight
                                                        size={18}
                                                        weight="bold"
                                                    />
                                                    Evaluate for Approval
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {canApprove && (
                                        <Button
                                            className="w-full gap-2"
                                            size="lg"
                                            onClick={() =>
                                                handleAction("approve")
                                            }
                                            disabled={!canAct}
                                        >
                                            {statusMutation.isPending ? (
                                                "Processing..."
                                            ) : (
                                                <>
                                                    <CheckCircle
                                                        size={18}
                                                        weight="bold"
                                                    />
                                                    Approve Loan
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {/* Empty-state — the loan is in a status
                                     * (Approved, Rejected, ForRevision, etc.)
                                     * where this role has no actions to take,
                                     * OR the loan is still at the encoder
                                     * stage. We render a soft amber panel so
                                     * the user understands the page is
                                     * intentionally read-only, not broken. */}
                                    {!canRecommend &&
                                        !canEvaluate &&
                                        !canApprove && (
                                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                                <p className="font-semibold">
                                                    No actions available
                                                </p>
                                                <p>
                                                    This application is not
                                                    currently awaiting action
                                                    from your role ({userRole}
                                                    ).
                                                </p>
                                            </div>
                                        )}
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    );
}
