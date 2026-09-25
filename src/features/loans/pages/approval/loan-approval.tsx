import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClaimById, useDeskQueue } from "@/src/features/loans/hooks/use-desk-queue";
import { keepPreviousData } from "@tanstack/react-query";
import {
    CheckCircle,
    XCircle,
    ArrowCounterClockwise,
    FilePdf,
    Printer,
    Clock,
    UserCircle,
    WarningCircle,
    MagnifyingGlassMinus,
    MagnifyingGlassPlus,
    ArrowLeft,
    ThumbsUp,
    ThumbsDown,
    ListChecks,
} from "@phosphor-icons/react";
import { toastError, toastSuccess } from "@/src/components/ui/toast";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
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
import { ApprovalFormDocument } from "./components/approval-form-document";
import { AttachmentsPanel } from "./components/attachments-panel";
import { DeviationRemarksPanel } from "./components/deviation-remarks-panel";
import { ApplicationTimeline } from "@/src/features/loans/components/application-timeline";
import { RoutingChip } from "./components/routing-chip";
import { useEscalationStore } from "@/src/features/loans/store/escalationStore";
import { IncompleteDocumentsWarning } from "../review/components/incomplete-documents-warning";
import { GroupReviewSection } from "../review/components/group-review-section";
import { ApprovalGroupTabs } from "./components/approval-group-tabs";
import { FlagIncompleteDocumentsDialog } from "./components/flag-incomplete-documents-dialog";
import { ApprovalFormViewport } from "@/src/features/loans/components/approval-form-sheet";
import { useLoanGroup } from "@/src/features/loans/hooks/use-loan-group";
import { useLoanSignatureChain, signatureKeys } from "@/src/features/loans/api/signatures";
import {
    getLoanDetail,
    getChecklistDocuments,
    updateLoanStatus,
    cancelLoanApplication,
    flagDocuments,
    CANCELLABLE_STATUSES,
    type LoanDetailResponse,
    type EvaluationVerdict,
    type WorkflowAction,
} from "@/src/features/loans/api/loan-review";
import { queryKeys } from "@/src/shared/lib/query/queryKeys";
import { cn } from "@/src/shared/lib/utils";
import { apiClient, getErrorMessage } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "@/src/lib/api/types";
import type { LoanStatus } from "@/src/features/loans/utils/loan-status";
import type { LoanApplicationFormData } from "@/src/features/loans/schemas/schema";
import { CREATION_TYPE, type DeviationReason } from "@/src/features/loans/schemas/schema";

// End-state statuses — the page freezes (`frozen`) and all workflow actions disappear.
const TERMINAL = ["Approved", "Rejected", "Disbursed", "OnGoing", "Cancelled"];
const MIN_REMARKS = 10; // mirrors UpdateLoanStatusValidator

const WORKFLOW_ACTION_MAP: Record<string, WorkflowAction> = {
    "ForChecking": "Recommend",
    "ForApproval": "Recommend",
    "ForRevision": "PushBack",
    "Approved": "Approve",
    "Rejected": "Reject",
};

function deriveWorkflowAction(def: WorkflowButtonDef): WorkflowAction {
    const base = WORKFLOW_ACTION_MAP[def.to];
    if (base === "Recommend" && def.verdict === "NotRecommended") return "NotRecommend";
    if (def.from === "ForApproval" && def.to === "ForRevision") return "ReturnForRevision";
    return base;
}

type WorkflowButtonDef = {
    role: string; from: string; to: string; label: string;
    kind: "advance" | "return" | "reject";
    verdict?: EvaluationVerdict;
    remarksRequired: boolean;
    confirm?: boolean;
};

const WORKFLOW_ACTIONS: WorkflowButtonDef[] = [
    { role: "Recommender", from: "ForRecommendation", to: "ForChecking", label: "Recommend for Checking", kind: "advance", remarksRequired: false },
    { role: "Recommender", from: "ForRecommendation", to: "ForRevision", label: "Push Back to Encoder", kind: "return", remarksRequired: true, confirm: true },
    // ── Evaluator ────────────────────────────────────────────────────
    { role: "Evaluator", from: "ForChecking", to: "ForApproval", label: "Recommended", kind: "advance", verdict: "Recommended", remarksRequired: false },
    { role: "Evaluator", from: "ForChecking", to: "ForApproval", label: "Not Recommended", kind: "advance", verdict: "NotRecommended", remarksRequired: true, confirm: true },
    { role: "Evaluator", from: "ForChecking", to: "ForRevision", label: "Push Back to Encoder", kind: "return", remarksRequired: true, confirm: true },
    // ── Approver ─────────────────────────────────────────────────────
    { role: "Approver", from: "ForApproval", to: "Approved", label: "Approve Loan", kind: "advance", remarksRequired: false },
    { role: "Approver", from: "ForApproval", to: "ForRevision", label: "Return to Encoder", kind: "return", remarksRequired: true, confirm: true },
    { role: "Approver", from: "ForApproval", to: "Rejected", label: "Reject", kind: "reject", remarksRequired: true, confirm: true },
];

function mapLoanToFormData(l: LoanDetailResponse): LoanApplicationFormData {
    // Codes outside the 0/1/2/6 enum silently collapse to NEW_LOAN.
    const creationTypeCode: 0 | 1 | 2 | 6 =
        l.creationTypeCode === CREATION_TYPE.RELOAN
            ? CREATION_TYPE.RELOAN
            : l.creationTypeCode === CREATION_TYPE.RESTRUCTURED
              ? CREATION_TYPE.RESTRUCTURED
              : l.creationTypeCode === CREATION_TYPE.ADDITIONAL_LOAN
                ? CREATION_TYPE.ADDITIONAL_LOAN
                : CREATION_TYPE.NEW_LOAN;

    // Backend sends free-text deviation reasons; anything outside the schema
    // enum is dropped here so the DeviationReason type holds.
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

    // Shape gap: optional DTO fields are defaulted above, so this is a
    // deliberate double cast rather than an exact assignment.
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
        // Multi-loan migration: the legacy single `loan` field was removed
        // from the schema in favour of `loans[]`. The approval page
        // renders ONE approval form per loan in this array (see
        // `loanIndex` prop on ApprovalFormDocument).
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
                    // Policy term (months) — not surfaced by the
                    // approval endpoint's `LoanDetailResponse` yet
                    // (it carries `termDays` only). Falls through as
                    // undefined so the form schema's `.optional()`
                    // accepts it; the field renders blank on the
                    // approval-page context.
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

export function LoanApprovalPage() {
    const { loanId } = useParams<{ loanId: string }>();
    const id = Number(loanId);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [remarks, setRemarks] = useState("");
    const [zoom, setZoom] = useState(1);
    const [tab, setTab] = useState("workflow");

    // ── Cancel dialog state ────────────────────────────────────────────────
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelPending, setCancelPending] = useState(false);

    // ── Flag dialog state ──────────────────────────────────────────────────
    const [flagOpen, setFlagOpen] = useState(false);

    const user = useAuthStore((s) => s.user);

    const loan = useQuery({
        queryKey: queryKeys.loans.review.detail(id),
        queryFn: () => getLoanDetail(id),
        enabled: Number.isFinite(id) && id > 0,
        staleTime: 30_000,        // back-nav / tab-return / mutation refetch: instant
        gcTime: 5 * 60_000,
        placeholderData: keepPreviousData,  // same-id refetches keep the sheet painted
    });

    const checklist = useQuery({
        queryKey: queryKeys.loans.review.checklistDocuments(id),
        queryFn: () => getChecklistDocuments(id),
        enabled: Number.isFinite(id) && id > 0,
        staleTime: 30_000,
    });

    // Signature chain — resolved from LoanActions audit trail.
    const { data: signatureSlots } = useLoanSignatureChain(id);

    // Group membership drives the sticky tab strip. Same query key as
    // GroupReviewSection's internal useLoanGroup — React Query dedupes,
    // so this costs zero extra requests.
    const group = useLoanGroup(loan.data?.applicationGroupNo ?? "");
    const groupLoans = group.data?.loans ?? [];

    // ── Selection is navigation: reset per-loan ephemeral state ──────
    useEffect(() => {
        setRemarks("");
        setZoom(1);
        setTab("workflow");
        setCancelOpen(false);
        setCancelReason("");
        window.scrollTo({ top: 0 });
    }, [id]);

    // ── Prefetch siblings so tab switches paint instantly ────────────
    // detail has staleTime 30s + keepPreviousData, so a prefetched
    // sibling renders its sheet synchronously on switch.
    useEffect(() => {
        for (const sibling of groupLoans) {
            if (sibling.id === id) continue;
            void qc.prefetchQuery({
                queryKey: queryKeys.loans.review.detail(sibling.id),
                queryFn: () => getLoanDetail(sibling.id),
            });
        }
    }, [groupLoans, id, qc]);

    const detail = loan.data;
    const frozen = detail ? TERMINAL.includes(detail.status) : false;
    const formData = useMemo(
        () => (detail ? mapLoanToFormData(detail) : null),
        [detail]
    );

    const claimById = useClaimById();
    const { data: desk } = useDeskQueue();
    const queueItem = desk?.items.find((i) => i.loanId === id);
    const queueState = queueItem
        ? {
            isHead: queueItem.isHead,
            ownerUserId: queueItem.ownerUserId,
            ownerName: queueItem.ownerName,
            isMine: queueItem.ownerUserId != null && queueItem.ownerUserId === (user?.userId ? Number(user.userId) : undefined),
            position: queueItem.position,
        }
        : undefined;

    const needsDeskGate = detail ? (
        (detail.status === "ForRecommendation" && user?.role === "Recommender") ||
        (detail.status === "ForChecking" && user?.role === "Evaluator") ||
        (detail.status === "ForApproval" && user?.role === "Approver")
    ) : false;

    const canAct = !needsDeskGate || queueState?.isMine || user?.role === "Admin";

    const actions = WORKFLOW_ACTIONS.filter((a) => a.role === user?.role && a.from === detail?.status);

    // Exactly the roles the transition map allows to flag at each desk —
    // the UI never offers a button that would 409.
    const canFlagAtDesk = detail ? (
        (detail.status === "ForRecommendation" && user?.role === "Recommender") ||
        (detail.status === "ForChecking" && user?.role === "Evaluator") ||
        (detail.status === "ForApproval" && user?.role === "Approver")
    ) : false;

    const flagAction = useMemo(
        () => detail?.actions ? [...detail.actions].reverse().find((a) => a.action === "DocumentsFlagged") : undefined,
        [detail?.actions]
    );

    const hasDocumentFlag = detail?.documentFlag != null;

    const act = useMutation({
        mutationFn: (payload: { action: WorkflowAction; kind: WorkflowButtonDef["kind"] }) =>
            updateLoanStatus(id, {
                action: payload.action,
                comments: (payload.kind === "return" || payload.action === "NotRecommend" || payload.action === "Reject" || payload.action === "ReturnForRevision")
                    ? remarks.trim()
                    : remarks.trim() || undefined,
            }),
        onSuccess: (_d, payload) => {
            toastSuccess(
                payload.action === "NotRecommend"
                    ? "Evaluation recorded as Not Recommended — forwarded to Approver."
                    : payload.kind === "return"
                        ? "Application pushed back to the encoder."
                        : `Application moved successfully.`);
            setRemarks("");
            qc.invalidateQueries({ queryKey: queryKeys.loans.review.detail(id) });
            qc.invalidateQueries({ queryKey: queryKeys.loans.review.timeline(id) });
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
            qc.invalidateQueries({ queryKey: signatureKeys.loan(id) });
        },
        onError: (e: unknown) => {
            const data = (e as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data;
            toastError(data?.message ?? getErrorMessage(e));
        },
    });

    const pushBackDocs = useMutation({
        mutationFn: ({ codes, text }: { codes: string[]; text: string }) =>
            flagDocuments(id, { missingRequirementCodes: codes, reason: text }),
        onSuccess: () => {
            toastSuccess("Documents flagged — the encoder has been notified. Review continues.");
            qc.invalidateQueries({ queryKey: queryKeys.loans.review.detail(id) });
            qc.invalidateQueries({ queryKey: queryKeys.loans.review.timeline(id) });
            qc.invalidateQueries({ queryKey: queryKeys.loans.review.checklistDocuments(id) });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard.full });
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
        },
        onError: (e: unknown) => toastError(getErrorMessage(e)),
    });

    // More than a dry check — when everything is present the hold is released
    // and the application re-enters the review queue.
    const recheck = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post<ApiResponse<{ complete: boolean; missing: string[] }>>(
                `/api/loans/${id}/documents/verify`);
            return unwrapApiData(res.data);
        },
        onSuccess: (r) => {
            toastSuccess(r.complete
                ? "All requirements uploaded — application released to the review queue."
                : `Still missing: ${r.missing.join(", ")}`);
            qc.invalidateQueries({ queryKey: queryKeys.loans.review.detail(id) });
            qc.invalidateQueries({ queryKey: queryKeys.loans.review.checklistDocuments(id) });
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
        },
        onError: (e: unknown) => toastError(getErrorMessage(e)),
    });

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
        const isForbidden = loan.error && typeof loan.error === 'object' && 'response' in loan.error
            && (loan.error as { response?: { status?: number } }).response?.status === 403;

        return (
            <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <WarningCircle size={48} className="mx-auto text-destructive" />
                    <h2 className="text-xl font-semibold">
                        {isForbidden ? "Access Denied" : "Failed to Load Application"}
                    </h2>
                    <p className="text-muted-foreground">
                        {isForbidden
                            ? "You don't have permission to view this loan application. This may be because your account doesn't have the required role, or the application belongs to a different branch. Please contact your administrator if you believe this is a mistake."
                            : "We couldn't load this loan application. Please try again or return to the monitoring page."}
                    </p>
                    <Button onClick={() => navigate("/loans/monitoring")}>
                        Return to Monitoring
                    </Button>
                </div>
            </div>
        );
    }

    const canWriteRemarks =
        user?.role === "Recommender" ||
        user?.role === "Evaluator" ||
        (user?.role === "Encoder" &&
            user.userId === String(detail.createdById)) ||
        user?.role === "Admin";
    const deviationCount =
        detail.deviationDetails.length +
        (detail.feeDeviationJustification ? 1 : 0);

    const canCancel = user?.role === "Encoder"
        && Number(user.userId) === detail.createdById
        && CANCELLABLE_STATUSES.includes(detail.status as LoanStatus)
        && !frozen;

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
                            Loan Review &amp; Approval
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
                        <RoutingChip loanId={id} />
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
                        {useEscalationStore.getState().isEscalated(id) && (
                            <Badge variant="secondary" className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800">
                                <WarningCircle size={12} weight="fill" /> Escalated
                            </Badge>
                        )}
                        {/* NOTE: `evaluationVerdict` stores the action verb ("EvaluatedRecommended"),
                            not the request verdict ("Recommended") sent by updateLoanStatus. */}
                        {detail.evaluationVerdict === "EvaluatedNotRecommended" && (
                            <Badge variant="secondary" className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800">
                                <ThumbsDown size={12} weight="fill" /> Evaluator: Not Recommended
                            </Badge>
                        )}
                        {detail.evaluationVerdict === "EvaluatedRecommended" && (
                            <Badge variant="secondary" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                                <ThumbsUp size={12} weight="fill" /> Evaluator: Recommended
                            </Badge>
                        )}
                        {detail.status === "Cancelled" && (
                            <Badge
                                variant="secondary"
                                className="gap-1.5 border-slate-400 bg-slate-100 text-slate-700 line-through"
                            >
                                <XCircle size={12} weight="fill" /> Cancelled by client
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {canFlagAtDesk && !frozen && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setFlagOpen(true)}
                                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                                <WarningCircle size={16} weight="bold" /> Flag as lacking documents
                            </Button>
                        )}
                        <Badge variant="outline" className="gap-1.5 font-normal">
                            <UserCircle size={14} />
                            {detail.createdByName} (Encoder)
                        </Badge>
                    </div>
                </div>

                {/* ── Group navigation (multi-loan applications only) ── */}
                <ApprovalGroupTabs
                    loans={groupLoans}
                    currentLoanId={id}
                    onSelect={(loanId) => navigate(`/loans/approval/${loanId}`)}
                    statusOf={(s) => s}
                />
            </header>

            <div className="container mx-auto px-6 py-8">
                <div className="mb-6">
                    <IncompleteDocumentsWarning
                        status={detail.status}
                        checklist={checklist.data}
                        documentFlag={detail.documentFlag}
                    />
                </div>
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
                                {/* Zoom clamped to 60–150%; toFixed(2) absorbs float drift from ±0.1 steps. */}
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
                                        catLoanClass={null}
                                        signatureSlots={signatureSlots ?? undefined}
                                    />
                                </ApprovalFormViewport>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Right rail: workflow + deviations + files ── */}
                    <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit lg:self-start">
                        <Tabs value={tab} onValueChange={setTab}>
                            <TabsList className="w-full">
                                <TabsTrigger
                                    value="workflow"
                                    className="flex-1"
                                >
                                    Workflow
                                </TabsTrigger>
                                <TabsTrigger
                                    value="deviations"
                                    className="flex-1"
                                >
                                    Deviations
                                    {deviationCount > 0
                                        ? ` (${deviationCount})`
                                        : ""}
                                </TabsTrigger>
                                <TabsTrigger value="files" className="flex-1">
                                    Files
                                </TabsTrigger>
                            </TabsList>

                            {/* ── Workflow Tab ── */}
                            <TabsContent value="workflow" className="pt-4">
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
                                            Review the sheet, then route the
                                            application. Remarks are mandatory.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6 pt-4">
                                        {/* ── Audit Trail ── */}
                                        <div className="space-y-3">
                                            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                <Clock size={12} /> Remarks
                                            </h3>
                                            <ApplicationTimeline loanId={id} variant="panel" />
                                        </div>

                                        <div className="h-px bg-border" />

                                        {/* ── Remarks ── */}
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="remarks"
                                                className="flex items-center gap-1.5 text-sm font-semibold"
                                            >
                                                Remarks / Conditions
                                                {actions.some((a) => a.remarksRequired) && <span className="text-destructive">*</span>}
                                            </Label>
                                            <Textarea
                                                id="remarks"
                                                rows={4}
                                                disabled={
                                                    frozen || act.isPending
                                                }
                                                placeholder="Comments, conditions, or reasons — stored with the workflow action…"
                                                value={remarks}
                                                onChange={(e) =>
                                                    setRemarks(e.target.value)
                                                }
                                            />
                                            {remarks.trim().length < MIN_REMARKS && !frozen && (
                                                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                    <WarningCircle
                                                        size={12}
                                                        weight="fill"
                                                    />{" "}
                                                    Required (min {MIN_REMARKS} chars) for pushback, rejection, and a Not Recommended evaluation.
                                                </p>
                                            )}
                                        </div>

                                        {/* ── Action buttons ── */}
                                        <div className="space-y-2">
                                            {needsDeskGate && !canAct && (
                                                queueState?.isHead && !queueState.ownerName ? (
                                                    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                                                        <span>You're next in the queue.</span>
                                                        <Button onClick={() => claimById.mutate(id)} disabled={claimById.isPending} className="gap-2">
                                                            Claim &amp; review
                                                        </Button>
                                                    </div>
                                                ) : queueState?.ownerName ? (
                                                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                                                        Currently with {queueState.ownerName}. You have view-only access until the lease is released.
                                                    </div>
                                                ) : (
                                                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                                                        Queued #{queueState?.position} — serve files in order from the Review Desk.
                                                    </div>
                                                )
                                            )}
                                            {canCancel && (
                                                <Button
                                                    variant="destructive"
                                                    className="w-full gap-2"
                                                    disabled={cancelOpen}
                                                    onClick={() => setCancelOpen(true)}
                                                >
                                                    <XCircle size={16} /> Cancel Application
                                                </Button>
                                            )}
                                            {frozen && (
                                                <p className="rounded-md bg-muted p-3 text-center text-xs text-muted-foreground">
                                                    This application is{" "}
                                                    <strong>
                                                        {detail.status}
                                                    </strong>{" "}
                                                    — no further actions.
                                                </p>
                                            )}
                                            {actions.map((a) => {
                                                const blocked = act.isPending || (a.remarksRequired && remarks.trim().length < MIN_REMARKS) || !canAct;
                                                const icon =
                                                    a.kind === "reject" ? <XCircle size={16} /> :
                                                    a.kind === "return" ? <ArrowCounterClockwise size={16} /> :
                                                    a.verdict === "NotRecommended" ? <ThumbsDown size={16} weight="fill" /> :
                                                    a.verdict === "Recommended" ? <ThumbsUp size={16} weight="fill" /> :
                                                    <CheckCircle size={16} weight="bold" />;

                                                const button = (
                                                    <Button
                                                        key={`${a.to}-${a.verdict ?? a.kind}`}
                                                        className={cn(
                                                            "w-full gap-2",
                                                            a.verdict === "NotRecommended" &&
                                                                "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-900",
                                                            a.kind === "return" &&
                                                                "border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive",
                                                        )}
                                                        variant={a.kind === "reject" ? "destructive"
                                                            : a.kind === "return" || a.verdict === "NotRecommended" ? "outline"
                                                            : "default"}
                                                        disabled={blocked}
                                                        onClick={() => !a.confirm && act.mutate({ action: deriveWorkflowAction(a), kind: a.kind })}
                                                    >
                                                        {icon} {a.label}
                                                    </Button>
                                                );

                                                if (!a.confirm) return <div key={`${a.to}-${a.verdict ?? a.kind}`}>{button}</div>;

                                                return (
                                                    <AlertDialog key={`${a.to}-${a.verdict ?? a.kind}`}>
                                                        <AlertDialogTrigger render={button} />
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Confirm: {a.label}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {a.kind === "return"
                                                                        ? "The application returns to the ENCODER (not the recommender) for revision. They will be notified with your remarks."
                                                                        : a.verdict === "NotRecommended"
                                                                            ? "The application still proceeds to the Approver, flagged as NOT RECOMMENDED with your remarks attached."
                                                                            : "This terminates the loan process and notifies the encoder."}
                                                                    {remarks.trim() && (
                                                                        <span className="mt-2 block border-l-2 border-border pl-2 italic">
                                                                            &ldquo;{remarks.trim()}&rdquo;
                                                                        </span>
                                                                    )}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className={a.kind === "return" || a.kind === "reject"
                                                                        ? "bg-destructive text-destructive-foreground"
                                                                        : "bg-amber-600 text-white hover:bg-amber-700"}
                                                                    onClick={() => act.mutate({ action: deriveWorkflowAction(a), kind: a.kind })}
                                                                >
                                                                    Confirm
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* ── Deviations Tab ── */}
                            <TabsContent value="deviations" className="pt-4">
                                <Card>
                                    <CardHeader className="border-b pb-4">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <WarningCircle
                                                size={18}
                                                weight="bold"
                                                className="text-amber-600"
                                            />
                                            Deviations &amp; Remarks
                                        </CardTitle>
                                        <CardDescription className="pt-1 text-xs">
                                            Each deviation carries the
                                            encoder&apos;s justification; the
                                            recommender and evaluator reply per
                                            deviation, and the encoder can answer
                                            back.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <DeviationRemarksPanel
                                            loanId={id}
                                            canWrite={!!canWriteRemarks}
                                            frozen={frozen}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* ── Files Tab ── */}
                            <TabsContent value="files" className="pt-4">
                                <Card>
                                    <CardHeader className="flex-row items-center justify-between border-b pb-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <ListChecks
                                                    size={18}
                                                    weight="bold"
                                                    className="text-primary"
                                                />
                                                Document Requirements
                                            </CardTitle>
                                            <CardDescription className="pt-1 text-xs">
                                                Checklist synced from the document server. Missing documents do not
                                                block review — a reviewer may flag the file or proceed to approval.
                                            </CardDescription>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={() => recheck.mutate()}
                                            disabled={recheck.isPending}
                                            title="Ask the document server to re-verify completeness now"
                                        >
                                            <ArrowCounterClockwise size={14} weight="bold" />
                                            Re-check documents
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <AttachmentsPanel
                                            loanId={id}
                                            frozen={frozen}
                                            canRemark={!!canWriteRemarks}
                                            canPushBack={
                                                (user?.role === "Evaluator" && detail.status === "ForChecking") ||
                                                (user?.role === "Recommender" && detail.status === "ForRecommendation") ||
                                                (user?.role === "Approver" && detail.status === "ForApproval") ||
                                                user?.role === "Admin"
                                            }
                                            pushBackPending={pushBackDocs.isPending}
                                            onPushBack={(codes, text) => pushBackDocs.mutate({ codes, text })}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        {/* ── Group Review Section ── */}
                        {detail.applicationGroupNo && (
                            <GroupReviewSection
                                groupNo={detail.applicationGroupNo}
                                currentLoanId={id}
                                allowedTargets={actions.map((a) => a.to)}
                                statusOf={(s) => s}
                                onSelectLoan={(loanId) => navigate(`/loans/approval/${loanId}`)}
                            />
                        )}
                    </aside>
                </div>
            </div>

            {/* ── Cancel confirmation dialog ──────────────────────────────── */}
            <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this application?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The client has withdrawn their application for{" "}
                            <strong>{detail.firstName} {detail.lastName}</strong>{" "}
                            (<code>{detail.lamId}</code>). The application will be
                            closed and the reviewer currently handling it will be notified.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="cancel-reason">Reason for cancellation *</Label>
                        <Textarea
                            id="cancel-reason"
                            rows={3}
                            placeholder="e.g. Client found financing elsewhere…"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            maxLength={2000}
                        />
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                            {cancelReason.trim().length}/2000 — minimum 10
                        </p>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setCancelOpen(false); setCancelReason(""); }}>
                            Keep application
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={cancelPending || cancelReason.trim().length < 10}
                            onClick={async () => {
                                setCancelPending(true);
                                try {
                                    await cancelLoanApplication(id, cancelReason.trim());
                                    toastSuccess("Application cancelled.");
                                    setCancelOpen(false);
                                    setCancelReason("");
                                    setCancelPending(false);
                                    qc.invalidateQueries({ queryKey: queryKeys.loans.review.detail(id) });
                                    qc.invalidateQueries({ queryKey: queryKeys.loans.review.timeline(id) });
                                    qc.invalidateQueries({ queryKey: queryKeys.loans.all });
                                } catch (e) {
                                    toastError(e instanceof Error ? e.message : "Could not cancel.");
                                    setCancelPending(false);
                                }
                            }}
                        >
                            {cancelPending ? "Cancelling…" : "Cancel application"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Flag Incomplete Documents dialog ─────────────────────────── */}
            <FlagIncompleteDocumentsDialog
                open={flagOpen}
                onOpenChange={setFlagOpen}
                items={checklist.data ?? []}
                isSubmitting={pushBackDocs.isPending}
                onSubmit={({ missingRequirementCodes, comments }) =>
                    pushBackDocs.mutate(
                        { codes: missingRequirementCodes, text: comments },
                        { onSuccess: () => setFlagOpen(false) }
                    )
                }
            />

        </div>
    );
}
