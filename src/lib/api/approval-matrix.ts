import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "./types";

// ── Approval Matrix Types ────────────────────────────────────────────────────

export interface ApprovalAuthorityDto {
    key: string;
    displayName: string;
    tier: number;
    priority: number;
    allowNew: boolean;
    allowRenewal: boolean;
    maxSeverity: 0 | 1 | 2; // None=0, Minor=1, Major=2
    maxTotalExposure: number;
    scopeType: 0 | 1 | 2; // Branch=0, Area=1, Global=2
}

export interface DeviationCatalogItemDto {
    id: number;
    description: string;
    severity: 0 | 1 | 2; // None=0, Minor=1, Major=2
}

export interface ApproverPresenceDto {
    userId: number;
    name: string;
    authorityKey: string;
    tier: number;
    online: boolean;
    reviewing: boolean;
}

export interface LoanRoutingDto {
    loanId: number;
    requiredApprovalTier: number | null;
    deviationSeverity: 0 | 1 | 2;
    totalExposure: number;
    loanType: string;
    matchedRule: string | null;
    documentsComplete: boolean;
    missingDocuments: string[];
    assignedApproverId: number | null;
    assignedApproverName: string | null;
}

// ── Query Keys ───────────────────────────────────────────────────────────────

export const approvalMatrixKeys = {
    authorities: () => ["approval-matrix", "authorities"] as const,
    deviationCatalog: () => ["approval-matrix", "deviation-catalog"] as const,
    presence: () => ["presence", "approvers"] as const,
    routing: (id: number) => ["loans", id, "routing"] as const,
};

// ── API Functions ────────────────────────────────────────────────────────────

export async function getApprovalAuthorities(): Promise<ApprovalAuthorityDto[]> {
    const res = await apiClient.get<ApiResponse<ApprovalAuthorityDto[]>>("/api/approval-authorities");
    return unwrapApiData(res.data);
}

export async function getDeviationCatalog(): Promise<DeviationCatalogItemDto[]> {
    const res = await apiClient.get<ApiResponse<DeviationCatalogItemDto[]>>("/api/deviation-catalog");
    return unwrapApiData(res.data);
}

export async function getApproverPresence(): Promise<ApproverPresenceDto[]> {
    const res = await apiClient.get<ApiResponse<ApproverPresenceDto[]>>("/api/presence/approvers");
    return unwrapApiData(res.data);
}

export async function getLoanRouting(id: number): Promise<LoanRoutingDto> {
    const res = await apiClient.get<ApiResponse<LoanRoutingDto>>(`/api/loans/${id}/routing`);
    return unwrapApiData(res.data);
}

export async function releaseAssignment(id: number): Promise<void> {
    await apiClient.post<ApiResponse<unknown>>(`/api/loans/${id}/assignment/release`);
}

// ── Severity Helpers ─────────────────────────────────────────────────────────

export const SEVERITY_LABELS: Record<number, string> = {
    0: "None",
    1: "Minor",
    2: "Major",
};

export const SEVERITY_BADGE_CLASSES: Record<number, string> = {
    0: "bg-slate-100 text-slate-700 border-slate-200",
    1: "bg-amber-50 text-amber-700 border-amber-200",
    2: "bg-red-50 text-red-700 border-red-200",
};

export const SCOPE_LABELS: Record<number, string> = {
    0: "Branch",
    1: "Area",
    2: "Global",
};
