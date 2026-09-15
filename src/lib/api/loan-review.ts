import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "./types";
import { queryKeys } from "@/src/lib/queryKeys";
import type { LoanStatus } from "@/src/lib/loan-status";
import { LOAN_STATUS_META } from "@/src/lib/loan-status";

// ── Envelope types mirroring the backend ────────────────────────────────

export type EvaluationVerdict = "Recommended" | "NotRecommended";

export interface LoanDetailResponse {
    id: number;
    lamId: string;
    applicationGroupNo: string;
    branchCode: string;
    loanNo: string;
    productCode: string;
    product: string;
    creationTypeCode: number | null;
    creationTypeLabel: string | null;
    requestingOfficer: string | null;
    lai: string | null;
    cisId: string | null;
    firstName: string;
    middleName: string | null;
    lastName: string;
    suffix: string | null;
    birthdate: string | null;
    address: string | null;
    agency: string | null;
    position: string | null;
    employeeId: string | null;
    netTakeHomePay: number | null;
    lengthOfService: string | null;
    region: string | null;
    divisionCode: string | null;
    stationCode: string | null;
    misAgency: string | null;
    school: string | null;
    referrer: string | null;
    purpose: string | null;
    proposedAmount: number;
    termDays: number;
    interestRate: number;
    nthpDate: string | null;
    notarialFee: number;
    docStamps: number;
    insurance: number;
    standardNotarialFee: number;
    standardDocStamps: number;
    standardInsurance: number;
    verificationFindings: string | null;
    hasDeviations: boolean;
    deviationDetails: string[];
    deviationJustifications: Record<string, string>;
    remarks: string | null;
    aoRecommendation: string | null;
    otherRemarks: string | null;
    feeDeviationJustification: string | null;
    status: string;
    applicationDate: string;
    lastActionDate: string;
    createdById: number;
    createdByName: string;
    actions: {
        id: number;
        action: string;
        fromStatus: string | null;
        toStatus: string | null;
        comments: string | null;
        actionDate: string;
        actionByUserName: string;
    }[];
    evaluationVerdict: string | null;
    outstandingLoans: {
        id: number;
        pn: string;
        principalBalance: number;
        amortization: number;
        outstandingBalance: number;
        dateGranted: string | null;
        dateMaturity: string | null;
        status: string;
        productWithDescription: string | null;
    }[];
    buyOuts: {
        id: number;
        pn: string;
        name: string;
        amortization: number;
        outstandingBalance: number;
    }[];
    ebiReloans: {
        id: number;
        pn: string;
        name: string;
        existingDeduction: number;
        outstandingBalance: number;
        payToClose: number;
    }[];
    incomingLoans: {
        id: number;
        name: string;
        deductions: number;
        remarks: string;
    }[];
    preLoanId: number | null;
    preLoanFormNumber: string | null;
}

export interface LoanChecklistDocumentDto {
    loanNo: string;
    loanProduct: string;
    idCode: string;
    checklistDescription: string | null;
    docId: number | null;
    docStr: string | null;
    miniStr: string | null;
    contentType: string | null;
    created: string | null;
    uploadedBy: string | null;
    uploadStatus: string;
}

export interface DeviationRemarkDto {
    id: number;
    loanDeviationId: number;
    parentRemarkId: number | null;
    authorName: string;
    authorRole: string;
    body: string;
    createdAt: string;
}

export interface DocumentRemarkDto {
    id: number;
    checklistIdCode: string;
    docId: number | null;
    parentRemarkId: number | null;
    authorName: string;
    authorRole: string;
    body: string;
    createdAt: string;
}

export interface LoanDeviationDto {
    id: number;
    reasonText: string;
    encoderJustification: string;
    isFeeOverride: boolean;
    sortOrder: number;
    remarks: DeviationRemarkDto[];
}

export const loanReviewKeys = {
    detail: (id: number) => ["loans", id, "detail"] as const,
    history: (id: number) => ["loans", id, "history"] as const,
    checklistDocuments: (id: number) => ["loans", id, "checklist-documents"] as const,
    deviations: (id: number) => ["loans", id, "deviations"] as const,
    documentRemarks: (id: number) => ["loans", id, "document-remarks"] as const,
};

export async function getLoanDetail(id: number): Promise<LoanDetailResponse> {
    const res = await apiClient.get<ApiResponse<LoanDetailResponse>>(`/api/loans/${id}`);
    return unwrapApiData(res.data);
}

export async function getLoanHistory(id: number) {
    const res = await apiClient.get<
        ApiResponse<{
            id: number;
            actionBy: string;
            action: string;
            fromStatus: string | null;
            toStatus: string | null;
            comments: string | null;
            actionDate: string;
        }[]>
    >(`/api/loans/${id}/history`);
    return unwrapApiData(res.data);
}

export async function getChecklistDocuments(id: number): Promise<LoanChecklistDocumentDto[]> {
    const res = await apiClient.get<ApiResponse<LoanChecklistDocumentDto[]>>(
        `/api/loans/${id}/checklist-documents`
    );
    return unwrapApiData(res.data);
}

/**
 * Session-scoped blob cache: BPB_BINARY_SERVER reads go through OPENQUERY on a
 * linked server, so re-fetching on every open is the dominant latency. Capped
 * so a reviewer leafing through the checklist can't pin unbounded memory.
 */
const checklistBlobCache = new Map<number, Blob>();
const CHECKLIST_BLOB_CACHE_MAX = 5;

export async function fetchChecklistDocument(docId: number): Promise<Blob> {
    const cached = checklistBlobCache.get(docId);
    if (cached) return cached;

    const res = await apiClient.get(
        `/api/loans/checklist-documents/${docId}/view`,
        { responseType: "blob" },
    );
    const blob = res.data as Blob;

    if (checklistBlobCache.size >= CHECKLIST_BLOB_CACHE_MAX) {
        const oldest = checklistBlobCache.keys().next().value;
        if (oldest !== undefined) checklistBlobCache.delete(oldest);
    }
    checklistBlobCache.set(docId, blob);
    return blob;
}

/** Explicit download — same bytes, save dialog. */
export async function downloadChecklistDocument(docId: number, fileName: string): Promise<void> {
    const blob = await fetchChecklistDocument(docId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/** Mirrors the backend allow-list: what the preview surface can render. */
export function canPreviewInline(contentType: string | null): boolean {
    const t = (contentType ?? "").toLowerCase();
    return t === "application/pdf" || t === "image/png"
        || t === "image/jpeg" || t === "image/jpg" || t === "image/gif";
}

export async function getLoanDeviations(id: number): Promise<LoanDeviationDto[]> {
    const res = await apiClient.get<ApiResponse<LoanDeviationDto[]>>(
        `/api/loans/${id}/deviations`
    );
    return unwrapApiData(res.data);
}

export async function postDeviationRemark(
    loanId: number,
    deviationId: number,
    payload: { body: string; parentRemarkId?: number | null }
): Promise<DeviationRemarkDto> {
    const res = await apiClient.post<ApiResponse<DeviationRemarkDto>>(
        `/api/loans/${loanId}/deviations/${deviationId}/remarks`,
        payload
    );
    return unwrapApiData(res.data);
}

export async function getDocumentRemarks(id: number): Promise<DocumentRemarkDto[]> {
    const res = await apiClient.get<ApiResponse<DocumentRemarkDto[]>>(
        `/api/loans/${id}/document-remarks`
    );
    return unwrapApiData(res.data);
}

export async function postDocumentRemark(
    id: number,
    payload: {
        checklistIdCode: string;
        docId?: number | null;
        parentRemarkId?: number | null;
        body: string;
    }
): Promise<DocumentRemarkDto> {
    const res = await apiClient.post<ApiResponse<DocumentRemarkDto>>(
        `/api/loans/${id}/document-remarks`,
        payload
    );
    return unwrapApiData(res.data);
}

/** Roles allowed to write document remarks — mirrors the backend WriterRoles. */
export const DOCUMENT_REMARK_WRITER_ROLES = [
    "Recommender",
    "Evaluator",
    "Approver",
    "Admin",
];

/**
 * Write-access rule for document remark threads.
 * Reviewers (+Admin) may remark on any loan they can read; Encoders may
 * add/reply only on applications they submitted. Mirrors the ownership guard
 * in DocumentRemarkEndpoints.cs — the backend remains the authority.
 */
export function canWriteDocumentRemarks(
    role: string | undefined,
    isLoanOwner: boolean,
): boolean {
    if (role === "Encoder") return isLoanOwner;
    return (DOCUMENT_REMARK_WRITER_ROLES as readonly string[]).includes(role ?? "");
}

export async function updateLoanStatus(
    id: number,
    status: string,
    comments: string,
    verdict?: EvaluationVerdict,
) {
    const res = await apiClient.put<ApiResponse<unknown>>(`/api/loans/${id}/status`, {
        status,
        comments,
        verdict: verdict ?? null,
    });
    return unwrapApiData(res.data);
}

// ── Cancel Loan Application ─────────────────────────────────────────────────

/**
 * POST /api/loans/{id}/cancel — client-withdrawn by the owning Encoder.
 *
 * Encoder-only; the backend enforces ownership and status eligibility server-side.
 */
export async function cancelLoanApplication(
    loanId: number,
    reason: string,
): Promise<void> {
    await apiClient.post<ApiResponse<unknown>>(`/api/loans/${loanId}/cancel`, { reason });
}

/** Statuses from which an Encoder may cancel their own application. */
export const CANCELLABLE_STATUSES: LoanStatus[] = [
    "Draft", "ForRecommendation", "ForChecking", "ForApproval", "ForRevision",
];

// ── SLA Policy ──────────────────────────────────────────────────────────────

/**
 * GET /api/loans/sla-policy — handling-SLA hours per workflow stage.
 *
 * Ops-tunable in appsettings ("WorkflowSlaHours"); fetched once per session.
 * The frontend ships sane built-in defaults (from LOAN_STATUS_META) so the
 * UI degrades gracefully when the endpoint is unreachable.
 */
export async function getSlaPolicy(): Promise<Record<string, number>> {
    const res = await apiClient.get<ApiResponse<Record<string, number>>>("/api/loans/sla-policy");
    return unwrapApiData(res.data);
}

/** Fetched once per session; the UI falls back to built-in defaults on error. */
export function useSlaPolicy() {
    return useQuery({
        queryKey: queryKeys.loans.slaPolicy,
        queryFn: getSlaPolicy,
        staleTime: Infinity,
        retry: 1,
    });
}

// ── Queue Default (role-based) ───────────────────────────────────────────────

/**
 * GET /api/loans/queue-default — the caller's role-based default status filter.
 *
 * Pure claims-lookup on the backend (zero DB cost). Cached forever
 * client-side; the local mirror in role-queues.ts covers the synchronous
 * first paint and degrades gracefully when the endpoint is unreachable.
 */
export async function getQueueDefault(): Promise<LoanStatus[]> {
    const res = await apiClient.get<ApiResponse<string[]>>("/api/loans/queue-default");
    // Defensive: ignore any status the FE doesn't know how to render.
    return unwrapApiData(res.data).filter((s): s is LoanStatus => s in LOAN_STATUS_META);
}

/** Once per session; the mirror in role-queues.ts covers failures. */
export function useQueueDefault() {
    return useQuery({
        queryKey: queryKeys.loans.queueDefault,
        queryFn: getQueueDefault,
        staleTime: Infinity,
        retry: 1,
    });
}
