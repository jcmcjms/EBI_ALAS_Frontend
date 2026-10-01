import { apiClient } from '@/src/lib/apiClient'
import {
  unwrapApiData,
  type ApiResponse,
  type PagedResult,
} from '@/src/lib/api/types'

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

export async function getLoanCountByStatus(status: string): Promise<number> {
  const res = await apiClient.get<ApiResponse<PagedResult<{ id: number }>>>(
    '/api/loans',
    { params: { status, pageSize: 1 } },
  )
  return unwrapApiData(res.data).totalCount
}
