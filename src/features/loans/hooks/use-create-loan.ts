import { useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'

import { apiClient } from '@/src/shared/lib/apiClient'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { generateUUID } from '@/src/shared/lib/utils'
import {
  workflowKeys,
  type WorkflowConfigurationDto,
} from '@/src/shared/lib/api/workflow-shared'
import type {
  LoanSubmissionResult,
  SubmitLoanApplicationsRequest,
} from '../api/loan-submit'

export function useCreateLoan(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const keyRef = useRef<string>(generateUUID())

  const mutation = useMutation<
    LoanSubmissionResult,
    Error,
    SubmitLoanApplicationsRequest
  >({
    mutationFn: async (request) => {
      const res = await apiClient.post<LoanSubmissionResult>(
        '/api/loans',
        request,
      )
      return res.data
    },

    // 4xx validation responses are final — retrying delays the error toast.
    retry: false,

    onSuccess: (response) => {
      options?.onSuccess?.()
      queryClient.invalidateQueries({ queryKey: loanKeys.all })

      const workflow = queryClient.getQueryData<WorkflowConfigurationDto>(
        workflowKeys.configuration,
      )
      const destination = workflow?.requireRecommendation
        ? 'recommendation'
        : 'evaluation'
      const count = response.loans?.length ?? 1
      toastSuccess(
        `${count} loan${count === 1 ? '' : 's'} in application ${response.applicationGroupNo} submitted for ${destination}.`,
      )

      navigate({ to: '/loans/monitoring' })
    },

    onError: (error) => {
      toastError(getErrorMessage(error))
    },
  })

  const rotateIdempotencyKey = useCallback(() => {
    keyRef.current = generateUUID()
  }, [])

  return { ...mutation, rotateIdempotencyKey }
}
