import { useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'

import { loanApi } from '@/src/features/loans/api/loans'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { generateUUID } from '@/src/shared/lib/utils'
import {
  workflowKeys,
  type WorkflowConfigurationDto,
} from '@/src/shared/lib/api/workflow-shared'
import type {
  CreateLoanPayload,
  LoanSubmissionResponse,
} from '../api/loan-types'

export function useCreateLoan() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const keyRef = useRef<string>(generateUUID())

  const mutation = useMutation<
    LoanSubmissionResponse,
    Error,
    CreateLoanPayload
  >({
    mutationFn: (payload) => loanApi.createLoan(payload, keyRef.current),

    retry: 1,

    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all })

      const workflow = queryClient.getQueryData<WorkflowConfigurationDto>(
        workflowKeys.configuration,
      )
      const destination = workflow?.requireRecommendation
        ? 'recommendation'
        : 'evaluation'
      toastSuccess(
        `Loan application ${response.applicationGroupNo} submitted for ${destination}.`,
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
