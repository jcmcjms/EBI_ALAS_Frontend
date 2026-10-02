import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

import { submitLoanApplication } from '@/src/features/loans/api/loans'
import { generateUUID } from '@/src/shared/lib/utils'
import type {
  LoanSubmissionPayload,
  LoanSubmissionResponse,
} from '@/src/shared/lib/api/types'

export function useLoanSubmission() {
  const queryClient = useQueryClient()
  const keyRef = useRef<string>(generateUUID())

  const mutation = useMutation<
    LoanSubmissionResponse,
    Error,
    LoanSubmissionPayload
  >({
    mutationFn: (payload) => submitLoanApplication(payload, keyRef.current),

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
