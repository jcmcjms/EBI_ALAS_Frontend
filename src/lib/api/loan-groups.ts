import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "./types";

export interface GroupLoanSummary {
    id: number;
    lamId: string;
    status: string;
    branchCode: string;
    loanNo: string;
    productCode: string;
    product: string;
    proposedAmount: number;
    unresolvedDocs: number;
}

export interface LoanGroupResponse {
    groupNo: string;
    loans: GroupLoanSummary[];
}

export interface GroupLoanResult {
    loanId: number;
    lamId: string;
    succeeded: boolean;
    error: string | null;
}

export interface GroupStatusResponse {
    succeeded: number;
    failed: number;
    results: GroupLoanResult[];
}

export async function getLoanGroup(groupNo: string): Promise<LoanGroupResponse> {
    const res = await apiClient.get<ApiResponse<LoanGroupResponse>>(
        `/api/loan-groups/${encodeURIComponent(groupNo)}`
    );
    return unwrapApiData(res.data);
}

export async function updateGroupStatus(
    groupNo: string,
    payload: {
        status: string;
        comments?: string;
        loanIds?: number[];
    }
): Promise<GroupStatusResponse> {
    const res = await apiClient.put<ApiResponse<GroupStatusResponse>>(
        `/api/loan-groups/${encodeURIComponent(groupNo)}/status`,
        payload
    );
    return unwrapApiData(res.data);
}
