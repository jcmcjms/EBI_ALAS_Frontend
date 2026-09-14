import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse, type PagedResult } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkflowConfigurationDto {
    requireRecommendation: boolean;
    initialStatus: string;
    stages: string[];
    source: "Database" | "AppConfig";
    updatedAt: string | null;
    updatedByName: string | null;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const workflowKeys = {
    configuration: ["workflow", "configuration"] as const,
};

// ─── API functions ───────────────────────────────────────────────────────────

export async function getWorkflowConfiguration(): Promise<WorkflowConfigurationDto> {
    const res = await apiClient.get<ApiResponse<WorkflowConfigurationDto>>(
        "/api/workflow/configuration"
    );
    return unwrapApiData(res.data);
}

export async function updateWorkflowConfiguration(
    requireRecommendation: boolean
): Promise<WorkflowConfigurationDto> {
    const res = await apiClient.put<ApiResponse<WorkflowConfigurationDto>>(
        "/api/workflow/configuration",
        { requireRecommendation }
    );
    return unwrapApiData(res.data);
}

/**
 * Fetch loan count by status — used for the "N loans waiting for
 * recommendation" warning in the confirm dialog when disabling the
 * recommendation step.
 */
export async function getLoanCountByStatus(status: string): Promise<number> {
    const res = await apiClient.get<
        ApiResponse<PagedResult<{ id: number }>>
    >("/api/loans", { params: { status, pageSize: 1 } });
    return unwrapApiData(res.data).totalCount;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

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
