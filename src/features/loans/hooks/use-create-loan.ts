import { useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toastSuccess, toastError } from '@/src/shared/ui/toast'

import { loanApi } from '@/src/features/loans/api/loans'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { queryKeys } from '@/src/shared/lib/query/queryKeys'
import { generateUUID } from '@/src/shared/lib/utils'
import {
  workflowKeys,
  type WorkflowConfigurationDto,
} from '@/src/features/admin/workflow/api/workflow'
import type {
  CreateLoanPayload,
  LoanSubmissionResponse,
} from '@/src/shared/lib/api/types'

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
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all })

      const workflow = queryClient.getQueryData<WorkflowConfigurationDto>(
        workflowKeys.configuration,
      )
      const destination = workflow?.requireRecommendation
        ? 'recommendation'
        : 'evaluation'
      toastSuccess(
        `Loan application ${response.applicationGroupNo} submitted for ${destination}.`,
      )

      navigate('/loans/monitoring')
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
