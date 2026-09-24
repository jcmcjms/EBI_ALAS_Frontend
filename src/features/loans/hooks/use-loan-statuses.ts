import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { queryKeys } from "@/src/lib/queryKeys";
import { unwrapApiData, type ApiResponse } from "@/src/lib/api/types";

/**
 * GET /api/loan-statuses — lookup of all valid loan workflow statuses.
 * Statuses are static backend constants; treat them as reference data.
 */
const LOAN_STATUSES_STALE_TIME = 60 * 60 * 1000; // 1 hour

export interface LoanStatusEntry {
    /** Backend status code (e.g. "ForApproval"). */
    code: string;
    /** Human-friendly label for UI display. */
    label: string;
    /** Whether this status represents a terminal state. */
    isTerminal?: boolean;
}

export function useLoanStatuses(): { data: LoanStatusEntry[]; isLoading: boolean; error: unknown } {
    const query = useQuery({
        queryKey: queryKeys.loanStatuses.list(),
        queryFn: async () => {
            const res = await apiClient.get<ApiResponse<LoanStatusEntry[]>>("/api/loan-statuses");
            return unwrapApiData(res.data);
        },
        staleTime: LOAN_STATUSES_STALE_TIME,
    });
    return {
        data: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
    };
}