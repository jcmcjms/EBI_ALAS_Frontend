import { apiClient } from '@/src/shared/lib/apiClient'

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
