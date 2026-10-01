import { useQuery } from '@tanstack/react-query'
import { getWorkflowConfiguration, workflowKeys } from '../api/workflow'

export function useWorkflowConfiguration() {
  return useQuery({
    queryKey: workflowKeys.configuration,
    queryFn: getWorkflowConfiguration,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}
