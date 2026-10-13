import { apiClient } from '@/src/shared/lib/apiClient'
import {
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

/** Bare DTO — the API does not wrap this payload in an ApiResponse envelope. */
export async function getWorkflowConfiguration(): Promise<WorkflowConfigurationDto> {
  const res = await apiClient.get<WorkflowConfigurationDto>(
    '/api/workflow/configuration',
  )
  return res.data
}

export async function updateWorkflowConfiguration(
  requireRecommendation: boolean,
): Promise<WorkflowConfigurationDto> {
  const res = await apiClient.put<WorkflowConfigurationDto>(
    '/api/workflow/configuration',
    { requireRecommendation },
  )
  return res.data
}

/** Count via the bare `BackendPageResult` from `GET /api/loans`. */
export async function getLoanCountByStatus(status: string): Promise<number> {
  const res = await apiClient.get<BackendPageResult<{ id: string }>>(
    '/api/loans',
    { params: { status, pageSize: 1 } },
  )
  return res.data.totalCount
}
