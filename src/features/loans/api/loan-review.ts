import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse, type PagedResult } from "@/src/lib/api/types";
import { queryKeys } from "@/src/lib/queryKeys";
import type { LoanStatus } from "@/src/features/loans/utils/loan-status";
import { LOAN_STATUS_META } from "@/src/features/loans/utils/loan-status";

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
    documentFlag: {
        flaggedAt: string;
        flaggedById: number | null;
        reason: string | null;
        missingCount: number;
    } | null;
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
    webLoanPnNumbers: string[];
    documentsComplete: boolean | null;
    documentsCompleteAt: string | null;
    assignedApproverName: string | null;
    requiredApprovalTier: number | null;
    assignedApproverId: number | null;
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

export interface ChecklistDocument {
    code: string;
    description: string;
    isUploaded: boolean;
    uploadedAt: string | null;
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

export interface DocumentRemarkDto {
    id: number;
    loanApplicationId: number;
    checklistIdCode: string;
    docId: number | null;
    parentRemarkId: number | null;
    authorId: number;
    authorName: string;
    authorRole: string;
    body: string;
    createdAt: string;
}

export interface DocumentChecklistItem {
    id: number;
    loanApplicationId: number;
    code: string;
    name: string;
    status: string;
    docId: number | null;
    updatedAtUtc: string;
}

export interface SlaPolicy {
    ForRecommendation: number;
    ForChecking: number;
    ForApproval: number;
}

// ── Unified Loan Timeline ────────────────────────────────────────────────

export interface TimelineEvent {
    id: string;
    type: "workflow" | "deviation" | "deviationRemark" | "documentRemark" | "remark";
    occurredAtUtc: string;
    actorName: string | null;
    actorRole: string | null;
    action: string | null;
    fromStatus: string | null;
    toStatus: string | null;
    comment: string | null;
    subject: string | null;
    subjectCode: string | null;
}

// ─── Query keys ─────────────────────────────────────────────────────────────

export const loanReviewKeys = {
    detail: (id: number) => ["loans", "review", id, "detail"] as const,
    history: (id: number) => ["loans", "review", id, "history"] as const,
    timeline: (id: number) => ["loans", "review", id, "timeline"] as const,
    checklistDocuments: (id: number) =>
        ["loans", "review", id, "checklist-documents"] as const,
    documentRemarks: (loanId: number) => ["loans", "review", loanId, "document-remarks"] as const,
    documentChecklist: (loanId: number) => ["loans", "review", loanId, "document-checklist"] as const,
    slaPolicy: ["loans", "sla-policy"] as const,
};

// ─── API Functions ──────────────────────────────────────────────────────────

export async function getLoanDetail(id: number): Promise<LoanDetailResponse> {
    const res = await apiClient.get<ApiResponse<LoanDetailResponse>>(
        `/api/loans/${id}`,
    );
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

export async function getLoanTimeline(
    id: number,
    page: number,
    pageSize: number,
): Promise<PagedResult<TimelineEvent>> {
    const res = await apiClient.get<ApiResponse<PagedResult<TimelineEvent>>>(
        `/api/loans/${id}/timeline`, { params: { page, pageSize } });
    return unwrapApiData(res.data);
}

export async function getLoanAttachments(id: number): Promise<LoanAttachmentDto[]> {
    const res = await apiClient.get<ApiResponse<LoanAttachmentDto[]>>(
        `/api/loans/${id}/attachments`
    );
    return unwrapApiData(res.data);
}

export async function getChecklistDocuments(id: number): Promise<LoanChecklistDocumentDto[]> {
    const res = await apiClient.get<ApiResponse<LoanChecklistDocumentDto[]>>(
        `/api/loans/${id}/checklist-documents`
    );
    return unwrapApiData(res.data);
}

export async function viewChecklistDocument(docId: number, fileName: string) {
    const res = await apiClient.get(`/api/loans/checklist-documents/${docId}/view`, {
        responseType: "blob",
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
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
    toStatus: string,
    remarks: string,
    verdict?: EvaluationVerdict,
    extra?: Record<string, unknown>,
): Promise<void> {
    const res = await apiClient.put<ApiResponse<null>>(`/api/loans/${id}/status`, {
        toStatus,
        remarks,
        verdict,
        ...extra,
    });
    if (!res.data.success)
        throw new Error(res.data.message || "Failed to update status");
}

export async function cancelLoanApplication(
    id: number,
    reason: string,
): Promise<void> {
    const res = await apiClient.post<ApiResponse<null>>(
        `/api/loans/${id}/cancel`,
        { reason },
    );
    if (!res.data.success)
        throw new Error(res.data.message || "Failed to cancel application");
}

export const CANCELLABLE_STATUSES: LoanStatus[] = [
    "Draft",
    "ForRecommendation",
    "ForChecking",
    "ForApproval",
    "ForRevision",
];

// ── Document Flag ───────────────────────────────────────────────────────

/** Flag documents as missing (POST /api/loans/{id}/document-flag). */
export async function flagDocuments(
    loanId: number,
    payload: { missingRequirementCodes: string[]; reason: string },
): Promise<void> {
    const res = await apiClient.post<ApiResponse<null>>(
        `/api/loans/${loanId}/document-flag`,
        payload,
    );
    if (!res.data.success)
        throw new Error(res.data.message || "Failed to flag documents");
}

/** Clear the document flag (DELETE /api/loans/{id}/document-flag). */
export async function clearDocumentFlag(loanId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<null>>(
        `/api/loans/${loanId}/document-flag`,
    );
    if (!res.data.success)
        throw new Error(res.data.message || "Failed to clear document flag");
}

/** SLA policy — fetched once per session. */
export async function getSlaPolicy(): Promise<Record<string, number>> {
    const res = await apiClient.get<ApiResponse<Record<string, number>>>(
        "/api/loans/sla-policy",
    );
    return unwrapApiData(res.data);
}

// ── Document Remarks ────────────────────────────────────────────────────────

export async function getDocumentRemarks(loanId: number): Promise<DocumentRemarkDto[]> {
    const res = await apiClient.get<ApiResponse<DocumentRemarkDto[]>>(
        `/api/loans/${loanId}/document-remarks`
    );
    return unwrapApiData(res.data);
}

export async function postDocumentRemark(
    loanId: number,
    payload: {
        checklistIdCode: string;
        docId?: number | null;
        parentRemarkId?: number | null;
        body: string;
    }
): Promise<DocumentRemarkDto> {
    const res = await apiClient.post<ApiResponse<DocumentRemarkDto>>(
        `/api/loans/${loanId}/document-remarks`,
        payload
    );
    return unwrapApiData(res.data);
}

// ── Document Checklist ──────────────────────────────────────────────────────

export async function getDocumentChecklist(loanId: number): Promise<DocumentChecklistItem[]> {
    const res = await apiClient.get<ApiResponse<DocumentChecklistItem[]>>(
        `/api/loans/${loanId}/checklist-documents`
    );
    return unwrapApiData(res.data);
}

// ── Preview Helpers ─────────────────────────────────────────────────────────

export function canPreviewInline(contentType: string | null): boolean {
    if (!contentType) return false;
    return (
        contentType.startsWith("image/") ||
        contentType === "application/pdf"
    );
}

export async function fetchChecklistDocument(docId: number): Promise<{ url: string; contentType: string | null }> {
    const res = await apiClient.get(`/api/loans/checklist-documents/${docId}/view`, {
        responseType: "blob",
    });
    const blob = res.data as Blob;
    return {
        url: URL.createObjectURL(blob),
        contentType: blob.type || null,
    };
}

// ── Queue Default (role-based) ───────────────────────────────────────────────

export async function getQueueDefault(): Promise<LoanStatus[]> {
    const res = await apiClient.get<ApiResponse<string[]>>("/api/loans/queue-default");
    return unwrapApiData(res.data).filter((s): s is LoanStatus => s in LOAN_STATUS_META);
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useSlaPolicy() {
    return useQuery({
        queryKey: loanReviewKeys.slaPolicy,
        queryFn: getSlaPolicy,
        staleTime: Infinity,
        retry: 1,
    });
}

export function useQueueDefault() {
    return useQuery({
        queryKey: queryKeys.loans.queueDefault,
        queryFn: getQueueDefault,
        staleTime: Infinity,
        retry: 1,
    });
}
