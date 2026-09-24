/**
 * Approval authorities hook — reference data for approver dropdowns.
 */

import { useQuery } from "@tanstack/react-query";
import {
    getApprovalAuthorities,
    approvalMatrixKeys,
    type ApprovalAuthorityDto,
} from "../api/approval-matrix";

export function useApprovalAuthorities(enabled = true) {
    return useQuery<ApprovalAuthorityDto[]>({
        queryKey: approvalMatrixKeys.authorities(),
        queryFn: getApprovalAuthorities,
        enabled,
        staleTime: Infinity,
    });
}
