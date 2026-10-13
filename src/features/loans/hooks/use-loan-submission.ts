import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

import { submitLoan } from '@/src/features/loans/api/loans'
import { generateUUID } from '@/src/shared/lib/utils'
import type {
  LoanSubmissionResult,
  SubmitLoanApplicationsRequest,
} from '../api/loan-submit'

export function useLoanSubmission() {
  const queryClient = useQueryClient()
  const keyRef = useRef<string>(generateUUID())

  const mutation = useMutation<
    LoanSubmissionResult,
    Error,
    SubmitLoanApplicationsRequest
  >({
    mutationFn: (request) => submitLoan(request),

    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
    },
  })

  const rotateIdempotencyKey = useCallback(() => {
    keyRef.current = generateUUID()
  }, [])

  return { ...mutation, rotateIdempotencyKey }
}
