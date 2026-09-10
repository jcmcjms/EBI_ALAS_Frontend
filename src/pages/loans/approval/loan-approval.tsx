import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CheckCircle,
    XCircle,
    ArrowCounterClockwise,
    ArrowRight,
    FilePdf,
    Printer,
    Clock,
    UserCircle,
    WarningCircle,
    MagnifyingGlassMinus,
    MagnifyingGlassPlus,
    ArrowLeft,
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
import { ApprovalFormViewport } from "@/src/components/loan/approval-form-sheet";
import {
    getLoanDetail,
    getLoanHistory,
    loanReviewKeys,
    updateLoanStatus,
    type LoanDetailResponse,
} from "@/src/lib/api/loan-review";
import { queryKeys } from "@/src/lib/queryKeys";
import type { LoanApplicationFormData } from "../create/schema";
import { CREATION_TYPE, type DeviationReason } from "../create/schema";

const TERMINAL = ["Approved", "Rejected", "Disbursed", "OnGoing"];

/**
 * Map the flattened `LoanDetailResponse` (returned by `GET /api/loans/{id}`)
 * into the nested `LoanApplicationFormData` shape the existing
 * `ApprovalFormDocument` consumes.
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

    const actions = [
        {
            role: "Recommender",
            from: "ForRecommendation",
            to: "ForChecking",
            label: "Recommend for Checking",
            kind: "advance" as const,
        },
        {
            role: "Evaluator",
            from: "ForChecking",
            to: "ForApproval",
            label: "Endorse for Approval",
            kind: "advance" as const,
        },
        {
            role: "Evaluator",
            from: "ForChecking",
            to: "ForRevision",
            label: "Return to Encoder",
            kind: "return" as const,
        },
        {
            role: "Approver",
            from: "ForApproval",
            to: "Approved",
            label: "Approve Loan",
            kind: "advance" as const,
        },
        {
            role: "Approver",
            from: "ForApproval",
            to: "ForRevision",
            label: "Return to Encoder",
            kind: "return" as const,
        },
        {
            role: "Approver",
            from: "ForApproval",
            to: "Rejected",
            label: "Reject",
            kind: "reject" as const,
        },
    ].filter((a) => a.role === user?.role && a.from === detail?.status);

    const act = useMutation({
        mutationFn: (to: string) => updateLoanStatus(id, to, remarks.trim()),
        onSuccess: (_d, to) => {
            toast.success(`Application moved to ${to}.`);
            setRemarks("");
            qc.invalidateQueries({ queryKey: loanReviewKeys.detail(id) });
            qc.invalidateQueries({ queryKey: loanReviewKeys.history(id) });
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
        },
        onError: (e: Error) => toast.error(e.message),
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

    const canWriteRemarks =
        user?.role === "Recommender" ||
        user?.role === "Evaluator" ||
        (user?.role === "Encoder" &&
            user.userId === String(detail.createdById)) ||
        user?.role === "Admin";
    const canUpload = canWriteRemarks || user?.role === "Approver";
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
                                        catLoanClass={null}
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
                                                <Clock size={12} /> Audit Trail
                                            </h3>
                                            {history.isLoading ? (
                                                <div className="flex justify-center py-4">
                                                    <Spinner className="size-5" />
                                                </div>
                                            ) : (
                                                <ul className="space-y-3 text-xs">
                                                    {(history.data ?? []).map(
                                                        (h) => (
                                                            <li
                                                                key={h.id}
                                                                className="flex gap-3"
                                                            >
                                                                {h.toStatus ===
                                                                "Rejected" ? (
                                                                    <XCircle
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
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {
                                                                            h.actionBy
                                                                        }
                                                                    </p>
                                                                    <p className="text-muted-foreground">
                                                                        {
                                                                            h.action
                                                                        }
                                                                        {h.toStatus
            ? ` → ${h.toStatus}`
            : ""}{" "}
                                                                        •{" "}
                                                                        {new Date(
                                                                            h.actionDate
                                                                        ).toLocaleString()}
                                                                    </p>
                                                                    {h.comments && (
                                                                        <p className="mt-1 border-l-2 border-border pl-2 italic text-muted-foreground">
                                                                            &ldquo;
                                                                            {
                                                                                h.comments
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

                                        {/* ── Remarks ── */}
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="remarks"
                                                className="flex items-center gap-1.5 text-sm font-semibold"
                                            >
                                                Remarks / Conditions{" "}
                                                <span className="text-destructive">
                                                    *
                                                </span>
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
                                            {remarks.trim().length === 0 &&
                                                !frozen && (
                                                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <WarningCircle
                                                            size={12}
                                                            weight="fill"
                                                        />{" "}
                                                        Required to take a
                                                        workflow action
                                                    </p>
                                                )}
                                        </div>

                                        {/* ── Action buttons ── */}
                                        <div className="space-y-2">
                                            {frozen && (
                                                <p className="rounded-md bg-muted p-3 text-center text-xs text-muted-foreground">
                                                    This application is{" "}
                                                    <strong>
                                                        {detail.status}
                                                    </strong>{" "}
                                                    — no further actions.
                                                </p>
                                            )}
                                            {actions
                                                .filter(
                                                    (a) => a.kind !== "reject"
                                                )
                                                .map((a) => (
                                                    <Button
                                                        key={a.to}
                                                        className="w-full gap-2"
                                                        variant={
                                                            a.kind === "return"
                                                                ? "outline"
                                                                : "default"
                                                        }
                                                        disabled={
                                                            remarks.trim()
                                                                .length === 0 ||
                                                            act.isPending
                                                        }
                                                        onClick={() =>
                                                            act.mutate(a.to)
                                                        }
                                                    >
                                                        {a.kind === "return" ? (
                                                            <ArrowCounterClockwise
                                                                size={16}
                                                            />
                                                        ) : (
                                                            <CheckCircle
                                                                size={16}
                                                                weight="bold"
                                                            />
                                                        )}
                                                        {a.label}
                                                    </Button>
                                                ))}
                                            {actions.some(
                                                (a) => a.kind === "reject"
                                            ) && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger
                                                        render={
                                                            <Button
                                                                variant="destructive"
                                                                className="w-full gap-2"
                                                                disabled={
                                                                    remarks.trim()
                                                                        .length ===
                                                                        0 ||
                                                                    act.isPending
                                                                }
                                                            />
                                                        }
                                                    >
                                                        <XCircle size={16} />{" "}
                                                        Reject
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                Reject this
                                                                application?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This terminates
                                                                the loan
                                                                process and
                                                                notifies the
                                                                encoder.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>
                                                                Cancel
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-destructive text-destructive-foreground"
                                                                onClick={() =>
                                                                    act.mutate(
                                                                        "Rejected"
                                                                    )
                                                                }
                                                            >
                                                                Confirm
                                                                Rejection
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
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
                                    <CardHeader className="border-b pb-4">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <FilePdf
                                                size={18}
                                                weight="bold"
                                                className="text-primary"
                                            />
                                            Attached Files
                                        </CardTitle>
                                        <CardDescription className="pt-1 text-xs">
                                            Supporting documents submitted with,
                                            or added during, review.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <AttachmentsPanel
                                            loanId={id}
                                            frozen={frozen}
                                            canUpload={!!canUpload}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </aside>
                </div>
            </div>
        </div>
    );
}
