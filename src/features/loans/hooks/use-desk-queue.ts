import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/shared/lib/query/queryKeys";
import { unwrapApiData, type ApiResponse } from "@/src/lib/api/types";
import { toastError, toastSuccess, toastInfo } from "@/src/components/ui/toast";



export interface QueuedLoanDto {
    loanId: number;
    lamId: string;
    clientName: string;
    position: number;
    isHead: boolean;
    ownerUserId: number | null;
    ownerName: string | null;
    enqueuedAt: string;
    status: string;
    branchCode: string;
    productCode: string;
    product: string;
    loanType: string | null;
    purpose: string | null;
    proposedAmount: number;
    termDays: number;
    applicationDate: string;
    hasDeviations: boolean;
}

export interface DeskQueueResponse {
    deskLabel: string;
    items: QueuedLoanDto[];
    currentClaim: QueuedLoanDto | null;
    scopeDescription: string;
}

export interface ClaimResponse {
    loanId: number;
    lamId: string;
    clientName: string;
    status: string;
    leasedAt: string;
}




export function useDeskQueue() {
    return useQuery({
        queryKey: queryKeys.loans.desk,
        queryFn: async (): Promise<DeskQueueResponse> => {
            const { data: envelope } = await apiClient.get<ApiResponse<DeskQueueResponse>>(
                "/api/loans/queue/my",
            );
            return unwrapApiData(envelope);
        },
        staleTime: 30_000, 
        
        
        
        refetchInterval: 30_000,
    });
}


export function useClaimNext() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<ClaimResponse | null> => {
            const { data: envelope } = await apiClient.post<ApiResponse<ClaimResponse | null>>(
                "/api/loans/queue/claim",
            );
            return unwrapApiData(envelope);
        },
        onSuccess: (result) => {
            if (result) {
                toastSuccess(`Serving ${result.lamId} — ${result.clientName}.`);
            } else {
                toastInfo("Queue is clear — nothing to serve.");
            }
            qc.invalidateQueries({ queryKey: queryKeys.loans.desk });
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard.full });
        },
        onError: (e: unknown) => toastError(getErrorMessage(e)),
    });
}


export function useReleaseClaim() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<void> => {
            const { data: envelope } = await apiClient.post<ApiResponse<unknown>>(
                "/api/loans/queue/release",
            );
            unwrapApiData(envelope);
        },
        onSuccess: () => {
            toastSuccess("Claim released — file returned to the queue.");
            qc.invalidateQueries({ queryKey: queryKeys.loans.desk });
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard.full });
        },
        onError: (e: unknown) => toastError(getErrorMessage(e)),
    });
}

export interface ClaimByIdResponse {
    loanId: number;
    lamId: string;
    clientName: string;
    status: string;
    leasedAt: string;
}

export function useClaimById() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (loanId: number): Promise<ClaimByIdResponse> => {
            const { data: envelope } = await apiClient.post<ApiResponse<ClaimByIdResponse>>(
                `/api/loans/queue/${loanId}/claim`,
            );
            return unwrapApiData(envelope);
        },
        onSuccess: (result) => {
            toastSuccess(`Serving ${result.lamId} — ${result.clientName}.`);
            qc.invalidateQueries({ queryKey: queryKeys.loans.desk });
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard.full });
        },
        onError: (e: unknown) => toastError(getErrorMessage(e)),
    });
}
