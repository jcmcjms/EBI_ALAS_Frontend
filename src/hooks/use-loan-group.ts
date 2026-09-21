import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/src/lib/queryKeys";
import { getLoanGroup, updateGroupStatus, type LoanGroupResponse, type GroupStatusResponse } from "@/src/lib/api/loan-groups";

export function useLoanGroup(groupNo: string | undefined, enabled = true) {
    return useQuery<LoanGroupResponse>({
        queryKey: queryKeys.loans.group(groupNo!),
        queryFn: () => getLoanGroup(groupNo!),
        enabled: enabled && !!groupNo,
        staleTime: 15_000,
    });
}

export function useUpdateGroupStatus() {
    const qc = useQueryClient();
    return useMutation<GroupStatusResponse, Error, {
        groupNo: string;
        payload: { status: string; comments?: string; loanIds?: number[] };
    }>({
        mutationFn: ({ groupNo, payload }) => updateGroupStatus(groupNo, payload),
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: queryKeys.loans.group(v.groupNo) });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard.full });
            qc.invalidateQueries({ queryKey: queryKeys.loans.all });
        },
    });
}
