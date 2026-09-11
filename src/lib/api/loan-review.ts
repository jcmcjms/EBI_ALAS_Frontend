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

export interface LoanAttachmentDto {
    id: number;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    category: string | null;
    uploadedById: number;
    uploadedByName: string;
    uploadedAt: string;
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
    attachments: (id: number) => ["loans", id, "attachments"] as const,
    deviations: (id: number) => ["loans", id, "deviations"] as const,
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

export async function getLoanAttachments(id: number): Promise<LoanAttachmentDto[]> {
    const res = await apiClient.get<ApiResponse<LoanAttachmentDto[]>>(
        `/api/loans/${id}/attachments`
    );
    return unwrapApiData(res.data);
}

export async function uploadLoanAttachment(
    id: number,
    file: File,
    category: string | null,
    onProgress?: (pct: number) => void
): Promise<LoanAttachmentDto> {
    const form = new FormData();
    form.append("file", file);
    if (category) form.append("category", category);
    const res = await apiClient.post<ApiResponse<LoanAttachmentDto>>(
        `/api/loans/${id}/attachments`,
        form,
        {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) =>
                onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
        }
    );
    return unwrapApiData(res.data);
}

export async function downloadLoanAttachment(attachmentId: number, fileName: string) {
    const res = await apiClient.get(`/api/loans/attachments/${attachmentId}/download`, {
        responseType: "blob",
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

export async function deleteLoanAttachment(attachmentId: number): Promise<void> {
    await apiClient.delete(`/api/loans/attachments/${attachmentId}`);
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
