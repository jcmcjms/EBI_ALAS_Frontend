import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/src/lib/queryKeys";
import {
    getDocumentRemarks,
    postDocumentRemark,
    getDocumentChecklist,
    type DocumentRemarkDto,
    type DocumentChecklistItem,
} from "@/src/lib/api/loan-review";

/** Threaded remarks per checklist code; FE groups by checklistIdCode. */
export function useDocumentRemarks(loanId: number) {
    const qc = useQueryClient();
    const query = useQuery<DocumentRemarkDto[]>({
        queryKey: queryKeys.loans.documentRemarks(loanId),
        queryFn: () => getDocumentRemarks(loanId),
        staleTime: 10_000,
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
    });

    const mutate = useMutation({
        mutationFn: (payload: { checklistIdCode: string; body: string; parentRemarkId?: number }) =>
            postDocumentRemark(loanId, payload),
        onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.loans.documentRemarks(loanId) }),
    });

    return { ...query, postRemark: mutate };
}

/** Document checklist with per-item status tracking. */
export function useDocumentChecklist(loanId: number) {
    return useQuery<DocumentChecklistItem[]>({
        queryKey: queryKeys.loans.documentChecklist(loanId),
        queryFn: () => getDocumentChecklist(loanId),
        staleTime: 10_000,
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
    });
}
