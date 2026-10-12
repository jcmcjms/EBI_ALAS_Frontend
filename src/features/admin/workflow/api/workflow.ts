import { apiClient } from '@/src/shared/lib/apiClient'
import {
  unwrapApiData,
  type ApiResponse,
  type BackendPageResult,
} from '@/src/shared/lib/api/types'

export interface WorkflowConfigurationDto {
  requireRecommendation: boolean
  initialStatus: string
  stages: string[]
  source: 'Database' | 'AppConfig'
  updatedAt: string | null
  updatedByName: string | null
}

export const workflowKeys = {
  configuration: ['workflow', 'configuration'] as const,
}

export async function getWorkflowConfiguration(): Promise<WorkflowConfigurationDto> {
  const res = await apiClient.get<ApiResponse<WorkflowConfigurationDto>>(
    '/api/workflow/configuration',
  )
  return unwrapApiData(res.data)
}

export async function updateWorkflowConfiguration(
  requireRecommendation: boolean,
): Promise<WorkflowConfigurationDto> {
  const res = await apiClient.put<ApiResponse<WorkflowConfigurationDto>>(
    '/api/workflow/configuration',
    { requireRecommendation },
  )
  return unwrapApiData(res.data)
}

/** Count via the bare `BackendPageResult` from `GET /api/loans`. */
export async function getLoanCountByStatus(status: string): Promise<number> {
  const res = await apiClient.get<BackendPageResult<{ id: string }>>(
    '/api/loans',
    { params: { status, pageSize: 1 } },
  )
  return res.data.totalCount
}
