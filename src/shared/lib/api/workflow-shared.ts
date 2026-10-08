import { apiClient } from '@/src/shared/lib/apiClient'
import { unwrapApiData, type ApiResponse } from '@/src/shared/lib/api/types'

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