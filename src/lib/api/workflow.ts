import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "./types";

export interface WorkflowConfigurationDto {
    requireRecommendation: boolean;
    initialStatus: string;
    stages: string[];
}

export const workflowKeys = {
    configuration: ["workflow", "configuration"] as const,
};

export async function getWorkflowConfiguration(): Promise<WorkflowConfigurationDto> {
    const res = await apiClient.get<ApiResponse<WorkflowConfigurationDto>>(
        "/api/workflow/configuration"
    );
    return unwrapApiData(res.data);
}

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
