import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CheckCircle,
    ArrowRight,
    ArrowCounterClockwise,
    FilePdf,
    Printer,
    Clock,
    UserCircle,
    WarningCircle,
    ThumbsDown,
    ThumbsUp,
    ArrowLeft,
    MagnifyingGlassMinus,
    MagnifyingGlassPlus,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { Spinner } from "@/src/components/ui/spinner";
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

import { useAuthStore } from "@/src/store/authStore";
import { ApprovalFormDocument } from "../approval/components/approval-form-document";
import { ApprovalFormViewport } from "@/src/components/loan/approval-form-sheet";
import { useCatLoanClass } from "@/src/hooks/use-cat-loan-class";
import { parseProductCode } from "@/src/lib/loan-product-display";
import {
    getLoanDetail,
    getLoanHistory,
    updateLoanStatus,
    loanReviewKeys,
    type LoanDetailResponse,
} from "@/src/lib/api/loan-review";
import { queryKeys } from "@/src/lib/queryKeys";
import type { LoanApplicationFormData } from "../create/schema";
import { CREATION_TYPE, type DeviationReason } from "../create/schema";

type EvaluationAction = "recommended" | "notRecommended" | "pushback";

const TERMINAL = ["Approved", "Rejected", "Disbursed", "OnGoing"];

/**
 * Map the flattened `LoanDetailResponse` into the nested
 * `LoanApplicationFormData` shape `ApprovalFormDocument` consumes.
 *
 * Mirrors `mapLoanToFormData` from the approval page so the same
 * document renderer works identically in both contexts.
 */
function mapLoanToFormData(l: LoanDetailResponse): LoanApplicationFormData {
    const creationTypeCode: 0 | 1 | 2 | 6 =
        l.creationTypeCode === CREATION_TYPE.RELOAN
            ? CREATION_TYPE.RELOAN
            : l.creationTypeCode === CREATION_TYPE.RESTRUCTURED
              ? CREATION_TYPE.RESTRUCTURED
              : l.creationTypeCode === CREATION_TYPE.ADDITIONAL_LOAN
                ? CREATION_TYPE.ADDITIONAL_LOAN
                : CREATION_TYPE.NEW_LOAN;

    const deviationDetails: DeviationReason[] = (l.deviationDetails ?? []).filter(
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
            creationTypeLabel: l.creationTypeLabel ?? "New Loan",
            branch: l.branchCode,
            requestingOfficer: l.requestingOfficer ?? "",
            lai: l.lai ?? l.lamId,
        },
        client: {
            cisId: l.cisId ?? "",
            firstName: l.firstName,
            middleName: l.middleName,
            lastName: l.lastName,
            suffix: l.suffix,
            birthdate: l.birthdate,
            address: l.address,
            agency: l.agency ?? "",
            position: l.position,
            employeeId: l.employeeId,
            netTakeHomePay: l.netTakeHomePay ?? 0,
            lengthOfService: l.lengthOfService,
            region: l.region,
            divisionCode: l.divisionCode,
            stationCode: l.stationCode,
            misAgency: l.misAgency,
            school: l.school,
            referrer: l.referrer,
        },
        loans: [
            {
                loanNo: l.loanNo ?? "",
                productCode: l.productCode ?? "",
                productDescription: l.product,
                creationTypeCode,
                creationTypeLabel: l.creationTypeLabel ?? "New Loan",
                branchCode: l.branchCode,
                parameters: {
                    product: l.product,
                    purpose: l.purpose ?? "",
                    proposedAmount: l.proposedAmount,
                    term: l.termDays,
                    policyTermMonths: undefined,
                    interestRate: l.interestRate,
                    nthpDate: l.nthpDate,
                    notarialFee: l.notarialFee ?? 0,
                    docStamps: l.docStamps ?? 0,
                    insurance: l.insurance ?? 0,
                    standardFeesSnapshot: {
                        notarialFee: l.standardNotarialFee ?? 0,
                        docStamps: l.standardDocStamps ?? 0,
                        insurance: l.standardInsurance ?? 0,
                    },
                },
            },
        ],
        outstandingLoans: l.outstandingLoans.map((o) => ({
            pn: o.pn,
            principalBalance: o.principalBalance,
            amortization: o.amortization,
            outstandingBalance: o.outstandingBalance,
            dateGranted: o.dateGranted,
            dateMaturity: o.dateMaturity,
            status: o.status,
        })),
        ebiReloans: l.ebiReloans.map((e) => ({
            pn: e.pn,
            name: e.name,
            existingDeduction: e.existingDeduction,
            outstandingBalance: e.outstandingBalance,
            payToClose: e.payToClose,
        })),
        buyOuts: l.buyOuts.map((b) => ({
            pn: b.pn,
            name: b.name,
            amortization: b.amortization,
            outstandingBalance: b.outstandingBalance,
        })),
        incomingLoans: l.incomingLoans.map((i) => ({
            name: i.name,
            deductions: i.deductions,
            remarks: i.remarks,
        })),
        verification: {
            findings: l.verificationFindings ?? "",
        },
        deviations: {
            hasDeviations: l.hasDeviations,
            deviationDetails,
            deviationJustifications: l.deviationJustifications ?? {},
            remarks: l.remarks ?? "",
            aoRecommendation: l.aoRecommendation ?? "",
            otherRemarks: l.otherRemarks ?? "",
            feeDeviationJustification: l.feeDeviationJustification ?? "",
        },
    } as unknown as LoanApplicationFormData;
}

export function LoanEvaluationPage() {
    const { loanId } = useParams<{ loanId: string }>();
    const id = Number(loanId);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [comments, setComments] = useState("");
    const [pendingAction, setPendingAction] = useState<EvaluationAction | null>(null);
    const [zoom, setZoom] = useState(1);
    const user = useAuthStore((s) => s.user);

    const loan = useQuery({
        queryKey: loanReviewKeys.detail(id),
        queryFn: () => getLoanDetail(id),
        enabled: Number.isFinite(id) && id > 0,
    });

    const history = useQuery({
        queryKey: loanReviewKeys.history(id),
        queryFn: () => getLoanHistory(id),
        enabled: Number.isFinite(id) && id > 0,
    });

    const detail = loan.data;
    const frozen = detail ? TERMINAL.includes(detail.status) : false;
    const formData = useMemo(
        () => (detail ? mapLoanToFormData(detail) : null),
        [detail]
    );

    const loanClass = useCatLoanClass(
        detail?.branchCode ?? "",
        detail?.loanNo ?? "",
        parseProductCode(detail?.product ?? "")
    );

    const updateStatus = useMutation({
        mutationFn: ({ status, comments }: { status: string; comments: string }) =>
            updateLoanStatus(id, status, comments),
        onSuccess: (_data, { status }) => {
            const actionLabel =
                status === "ForApproval"
                    ? pendingAction === "notRecommended"
                        ? "Not Recommended (forwarded to Approver)"
                        : "Recommended (forwarded to Approver)"
                    : "Pushed back to Encoder";
            toast.success(`Application ${actionLabel}.`);
            setComments("");
            setPendingAction(null);
            qc.invalidateQueries({ queryKey: loanReviewKeys.detail(id) });
            qc.invalidateQueries({ queryKey: loanReviewKeys.history(id) });
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
        },
        onError: (e: Error) => {
            toast.error(e.message);
            setPendingAction(null);
        },
    });

    const handleAction = (action: EvaluationAction) => {
        const trimmed = comments.trim();

        // Validation: pushback and notRecommended require comments
        if ((action === "pushback" || action === "notRecommended") && trimmed.length < 10) {
            toast.error("Comments are required (minimum 10 characters) for this action.");
            return;
        }

        setPendingAction(action);

        if (action === "pushback") {
            updateStatus.mutate({ status: "ForRevision", comments: trimmed });
        } else {
            // Both recommended and notRecommended go to ForApproval
            const finalComments =
                action === "notRecommended"
                    ? `[NOT RECOMMENDED] ${trimmed}`
                    : trimmed || "Recommended for approval.";
            updateStatus.mutate({ status: "ForApproval", comments: finalComments });
        }
    };

    // ── Empty / error states ─────────────────────────────────────────
    if (!Number.isFinite(id) || id <= 0) {
        return (
            <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
                <div className="text-center space-y-4">
                    <WarningCircle size={48} className="mx-auto text-destructive" />
                    <h2 className="text-xl font-semibold">Invalid Application ID</h2>
                    <Button onClick={() => navigate("/loans/monitoring")}>
                        Return to Monitoring
                    </Button>
                </div>
            </div>
        );
    }

    if (loan.isLoading) {
        return (
            <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
                <Spinner className="size-8" />
            </div>
        );
    }

    if (loan.isError || !detail || !formData) {
        return (
            <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
                <div className="text-center space-y-4">
                    <WarningCircle size={48} className="mx-auto text-destructive" />
                    <h2 className="text-xl font-semibold">Failed to Load Application</h2>
                    <Button onClick={() => navigate("/loans/monitoring")}>
                        Return to Monitoring
                    </Button>
                </div>
            </div>
        );
    }

    const isEvaluator = user?.role === "Evaluator";
    const isForChecking = detail.status === "ForChecking";
    const showEvaluatorActions = isEvaluator && isForChecking && !frozen;

    // Comments required for pushback and notRecommended
    const commentsRequired = pendingAction === "pushback" || pendingAction === "notRecommended";
    const canAct =
        (!commentsRequired || comments.trim().length >= 10) && !updateStatus.isPending;

    const deviationCount =
        detail.deviationDetails.length +
        (detail.feeDeviationJustification ? 1 : 0);

    return (
        <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40">
            {/* ── Sticky header ──────────────────────────────────────────── */}
            <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur">
                <div className="container mx-auto flex h-16 flex-wrap items-center justify-between gap-3 px-6">
                    <div className="flex flex-wrap items-center gap-3">
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
                            Loan Evaluation
                        </h1>
                        <Badge variant="outline" className="text-xs">
                            {detail.lamId}
                        </Badge>
                        <Badge
                            variant="secondary"
                            className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700"
                        >
                            <Clock size={12} weight="fill" />
                            {detail.status}
                        </Badge>
                        {detail.hasDeviations && (
                            <Badge
                                variant="secondary"
                                className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700"
                            >
                                <WarningCircle size={12} weight="fill" />{" "}
                                {deviationCount} deviation
                                {deviationCount === 1 ? "" : "s"}
                            </Badge>
                        )}
                    </div>
                    <Badge variant="outline" className="gap-1.5 font-normal">
                        <UserCircle size={14} />
                        {detail.createdByName} (Encoder)
                    </Badge>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr),400px]">
                    {/* ── Document: fixed 800px sheet inside a zoomable viewport ── */}
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
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Zoom out"
                                        onClick={() =>
                                            setZoom((z) =>
                                                Math.max(0.6, +(z - 0.1).toFixed(2))
                                            )
                                        }
                                    >
                                        <MagnifyingGlassMinus size={15} />
                                    </Button>
                                    <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Zoom in"
                                        onClick={() =>
                                            setZoom((z) =>
                                                Math.min(1.5, +(z + 0.1).toFixed(2))
                                            )
                                        }
                                    >
                                        <MagnifyingGlassPlus size={15} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="ml-2 gap-1.5"
                                        onClick={() => window.print()}
                                    >
                                        <Printer size={14} weight="bold" /> Print
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ApprovalFormViewport zoom={zoom}>
                                    <ApprovalFormDocument
                                        data={formData}
                                        catLoanClass={loanClass.data?.catLoanClass ?? null}
                                    />
                                </ApprovalFormViewport>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Right rail: evaluation actions + audit trail ── */}
                    <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit lg:self-start">
                        <Card>
                            <CardHeader className="border-b pb-4">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <CheckCircle
                                        size={18}
                                        weight="bold"
                                        className="text-primary"
                                    />
                                    Evaluation Actions
                                </CardTitle>
                                <CardDescription className="pt-1 text-xs">
                                    Review the application and provide your
                                    evaluation recommendation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                {/* ── Audit Trail ── */}
                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <Clock size={12} /> Audit Trail
                                    </h3>
                                    {history.isLoading ? (
                                        <div className="flex justify-center py-4">
                                            <Spinner className="size-5" />
                                        </div>
                                    ) : (
                                        <ul className="space-y-3 text-xs">
                                            {(history.data ?? []).map((h) => (
                                                <li
                                                    key={h.id}
                                                    className="flex gap-3"
                                                >
                                                    {h.toStatus === "Rejected" ? (
                                                        <WarningCircle
                                                            size={16}
                                                            weight="fill"
                                                            className="mt-0.5 shrink-0 text-destructive"
                                                        />
                                                    ) : h.toStatus ===
                                                      "ForRevision" ? (
                                                        <ArrowCounterClockwise
                                                            size={16}
                                                            weight="bold"
                                                            className="mt-0.5 shrink-0 text-amber-500"
                                                        />
                                                    ) : (
                                                        <ArrowRight
                                                            size={16}
                                                            weight="bold"
                                                            className="mt-0.5 shrink-0 text-blue-500"
                                                        />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium">
                                                            {h.actionBy}
                                                        </p>
                                                        <p className="text-muted-foreground">
                                                            {h.action}
                                                            {h.toStatus
                                                                ? ` → ${h.toStatus}`
                                                                : ""}{" "}
                                                            &bull;{" "}
                                                            {new Date(
                                                                h.actionDate
                                                            ).toLocaleString()}
                                                        </p>
                                                        {h.comments && (
                                                            <p className="mt-1 border-l-2 border-border pl-2 italic text-muted-foreground">
                                                                &ldquo;
                                                                {h.comments}
                                                                &rdquo;
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="h-px bg-border" />

                                {/* ── Comments ── */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="eval-comments"
                                        className="flex items-center gap-1.5 text-sm font-semibold"
                                    >
                                        Remarks / Evaluation Notes
                                        {commentsRequired && (
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        )}
                                    </Label>
                                    <Textarea
                                        id="eval-comments"
                                        rows={5}
                                        disabled={frozen || updateStatus.isPending}
                                        placeholder="Provide your evaluation, findings, or conditions for approval…"
                                        value={comments}
                                        onChange={(e) =>
                                            setComments(e.target.value)
                                        }
                                        maxLength={2000}
                                    />
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        {commentsRequired &&
                                            comments.trim().length < 10 && (
                                                <p className="flex items-center gap-1">
                                                    <WarningCircle
                                                        size={12}
                                                        weight="fill"
                                                    />{" "}
                                                    Required for this action (min
                                                    10 characters)
                                                </p>
                                            )}
                                        <span className="ml-auto">
                                            {comments.length}/2000
                                        </span>
                                    </div>
                                </div>

                                {/* ── Action buttons ── */}
                                <div className="space-y-2">
                                    {frozen && (
                                        <p className="rounded-md bg-muted p-3 text-center text-xs text-muted-foreground">
                                            This application is{" "}
                                            <strong>{detail.status}</strong>{" "}
                                            — no further actions.
                                        </p>
                                    )}

                                    {showEvaluatorActions ? (
                                        <>
                                            {/* Primary: Recommended */}
                                            <Button
                                                className="w-full gap-2"
                                                size="lg"
                                                onClick={() =>
                                                    handleAction("recommended")
                                                }
                                                disabled={
                                                    !canAct || pendingAction !== null
                                                }
                                            >
                                                {updateStatus.isPending &&
                                                pendingAction === "recommended" ? (
                                                    <span className="animate-pulse">
                                                        Processing...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <ThumbsUp
                                                            size={18}
                                                            weight="bold"
                                                        />
                                                        Recommended for Approval
                                                    </>
                                                )}
                                            </Button>

                                            {/* Secondary: Not Recommended */}
                                            <Button
                                                variant="outline"
                                                className="w-full gap-2"
                                                onClick={() =>
                                                    handleAction("notRecommended")
                                                }
                                                disabled={
                                                    !canAct || pendingAction !== null
                                                }
                                            >
                                                {updateStatus.isPending &&
                                                pendingAction ===
                                                    "notRecommended" ? (
                                                    <span className="animate-pulse">
                                                        Processing...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <ThumbsDown size={16} />
                                                        Not Recommended
                                                    </>
                                                )}
                                            </Button>

                                            {/* Destructive: Push Back */}
                                            <AlertDialog>
                                                <AlertDialogTrigger
                                                    render={
                                                        <Button
                                                            variant="destructive"
                                                            className="w-full gap-2"
                                                            disabled={
                                                                !canAct ||
                                                                pendingAction !==
                                                                    null
                                                            }
                                                        />
                                                    }
                                                >
                                                    <ArrowCounterClockwise
                                                        size={16}
                                                    />
                                                    Push Back to Encoder
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            Push back this
                                                            application?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This returns the
                                                            application to the
                                                            encoder for revision.
                                                            The encoder will be
                                                            notified with your
                                                            evaluation comments.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel
                                                            disabled={
                                                                updateStatus.isPending
                                                            }
                                                        >
                                                            Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() =>
                                                                handleAction(
                                                                    "pushback"
                                                                )
                                                            }
                                                            disabled={
                                                                updateStatus.isPending
                                                            }
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Confirm Pushback
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </>
                                    ) : (
                                        !frozen && (
                                            <div className="rounded-md bg-muted p-4 text-center text-xs text-muted-foreground">
                                                No actions available for your
                                                role on this application status.
                                            </div>
                                        )
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
