/**
 * Workflow feature hooks — TanStack Query wrappers.
 */

import { useQuery } from "@tanstack/react-query";
import {
    getWorkflowConfiguration,
    workflowKeys,
} from "../api/workflow";

/**
 * Server-owned pipeline shape. 60s staleTime so an ops flip of
 * Workflow:RequireRecommendation propagates within a minute (and instantly
 * on tab focus) without polling hot.
 */
export function useWorkflowConfiguration() {
    return useQuery({
        queryKey: workflowKeys.configuration,
        queryFn: getWorkflowConfiguration,
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        retry: 1,
    });
}
