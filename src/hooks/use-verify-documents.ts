import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "@/src/lib/api/types";
import { queryKeys } from "@/src/lib/queryKeys";
import { loanReviewKeys } from "@/src/lib/api/loan-review";
import { approvalMatrixKeys } from "@/src/lib/api/approval-matrix";

interface VerifyDocumentsResult {
    complete: boolean;
    missing: string[];
    documentsCompleteAt: string | null;
}

/**
 * On-demand document completeness recheck. Calls the cache-bypassing
 * POST /api/loans/{id}/documents/verify endpoint and invalidates
 * all related queries so the monitoring badge + routing panel refresh.
 */
export function useVerifyDocuments(loanId: number | null) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await apiClient.post<ApiResponse<VerifyDocumentsResult>>(
                `/api/loans/${loanId}/documents/verify`,
            );
            return unwrapApiData(res.data);
        },
        onSuccess: (r) => {
            // Monitoring table badge
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
            // Routing panel (approval page)
            if (loanId !== null) {
                qc.invalidateQueries({ queryKey: approvalMatrixKeys.routing(loanId) });
                qc.invalidateQueries({ queryKey: loanReviewKeys.checklistDocuments(loanId) });
            }
            if (r.complete) {
                toastSuccess("Documents verified complete.");
            } else {
                toastError(`${r.missing.length} document(s) still missing.`);
            }
        },
        onError: (e: Error) => toastError(e.message),
    });
}
