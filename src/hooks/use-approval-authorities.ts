import { useQuery } from "@tanstack/react-query";
import { getApprovalAuthorities, approvalMatrixKeys } from "@/src/lib/api/approval-matrix";
import type { ApprovalAuthorityDto } from "@/src/lib/api/approval-matrix";

/**
 * Fetches the full approval authority matrix. Used by user management
 * drawers to populate the authority dropdown when Role = Approver.
 *
 * The matrix is seeded at startup and rarely changes, so we cache it
 * aggressively (staleTime: Infinity). A manual invalidation via
 * queryClient.invalidateQueries(approvalMatrixKeys.authorities()) will
 * force a refetch when an admin edits the matrix.
 */
export function useApprovalAuthorities(enabled = true) {
    return useQuery<ApprovalAuthorityDto[]>({
        queryKey: approvalMatrixKeys.authorities(),
        queryFn: getApprovalAuthorities,
        enabled,
        staleTime: Infinity,
    });
}
