import { useCallback, useEffect, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import axios from 'axios'
import { toastInfo, toastSuccess } from '@/src/shared/ui/feedback/toast'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import type { WebLoanCisSearchResponse } from '@/src/features/loans/api/loan-types'
import {
  deleteLoanCreationDraft,
  getLoanCreationDraft,
  saveLoanCreationDraft,
  saveLoanCreationDraftKeepalive,
} from '@/src/features/loans/api/loan-creation-draft'
import { getWebLoanByCis } from '@/src/features/loans/api/webloans'
import { findBranchName, useBranches } from '@/src/shared/lib/api/branches'

export type LoanDraftStatus = 'idle' | 'hydrating' | 'saving' | 'saved' | 'error'

export interface LoanCreationDraftApi {
  status: LoanDraftStatus
  savedAt: number | null
  errorMessage: string | null
  clearDraft: () => void
  discardDraft: () => void
  retry: () => void
}

const KEY_PREFIX = 'alas:loan-creation-draft:'
const DEFAULT_DEBOUNCE_MS = 1_200

export function loanDraftKey(userId: string): string {
  return `${KEY_PREFIX}${userId ?? 'anon'}`
}

interface StoredDraft {
  values: Partial<LoanApplicationFormData>
  savedAt: number
}

function readDraft(key: string): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDraft
    if (!parsed || typeof parsed !== 'object' || !parsed.values) return null
    return parsed
  } catch {
    return null
  }
}

function writeDraftLocal(
  key: string,
  values: LoanApplicationFormData | Partial<LoanApplicationFormData>,
  savedAt: number,
) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ values, savedAt }))
  } catch {
    /* storage blocked or full — the server copy stays primary */
  }
}

function removeDraftLocal(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

const EMPTY_FORM = {
  branchType: {
    creationTypeCode: null,
    creationTypeLabel: '',
    branch: '',
    requestingOfficer: '',
    lai: '',
  },
  client: {
    cisId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    birthdate: '',
    address: '',
    agency: '',
    position: '',
    employeeId: '',
    netTakeHomePay: 0,
    lengthOfService: '',
    region: '',
    divisionCode: '',
    stationCode: '',
    misAgency: '',
    school: '',
    referrer: '',
  },
  loans: [],
  outstandingLoans: [],
  preLoan: undefined,
  loanType: 'New',
} as unknown as LoanApplicationFormData

function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

/**
 * Overlay only WebLoan-sourced client identity fields. Officer-entered loans,
 * obligations, preLoan and creation-type choices stay untouched.
 */
export function applyWebLoanClientOverlay(
  current: LoanApplicationFormData,
  result: WebLoanCisSearchResponse,
  resolveBranchName?: (code: string) => string,
): LoanApplicationFormData {
  const b = result.borrower
  const accounts = result.accounts ?? []
  const firstBranchCode = accounts[0]?.branchCode
  return {
    ...current,
    branchType: {
      ...current.branchType,
      branch: firstBranchCode
        ? (resolveBranchName?.(firstBranchCode) ?? firstBranchCode)
        : current.branchType.branch,
      lai: accounts.map((a) => a.accountId).join(', '),
      requestingOfficer: b.requestingOfficer ?? '',
    },
    client: {
      ...current.client,
      cisId: b.cisNo || current.client.cisId,
      firstName: b.firstName ?? '',
      middleName: b.middleName ?? '',
      lastName: b.lastName ?? '',
      suffix: b.appelation ?? '',
      birthdate: toDateInput(b.birthDate),
      address: b.address ?? '',
      agency: b.agencyType ?? '',
      position: b.positionTitle ?? '',
      employeeId: b.employeeNumber ?? '',
      region: b.regionCode ?? '',
      divisionCode: b.divisionCode ?? '',
      stationCode: b.stationCode ?? '',
      lengthOfService: b.lengthOfService ?? '',
      misAgency: b.misAgency ?? '',
    },
  }
}

function parsePayload(payload: string): Partial<LoanApplicationFormData> | null {
  try {
    const parsed = JSON.parse(payload) as Partial<LoanApplicationFormData>
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function extractValidationMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return null
  const data = error.response.data as
    | { detail?: string; message?: string }
    | undefined
  return data?.detail ?? data?.message ?? null
}

interface Options {
  methods: UseFormReturn<LoanApplicationFormData>
  userId: string
  enabled?: boolean
  debounceMs?: number
}

export function useLoanCreationDraft({
  methods,
  userId,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: Options): LoanCreationDraftApi {
  const key = loanDraftKey(userId)

  const [status, setStatus] = useState<LoanDraftStatus>(enabled ? 'hydrating' : 'idle')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { data: branches } = useBranches()
  const branchesRef = useRef(branches)
  useEffect(() => {
    branchesRef.current = branches
  }, [branches])

  const dirtyRef = useRef(false)
  const touchedRef = useRef(false)
  const skipNextWatchRef = useRef(false)
  const lastSavedRef = useRef('')
  const serializeRef = useRef(() => JSON.stringify(methods.getValues()))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydrationRef = useRef(0)

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const serialize = useCallback(
    () => JSON.stringify(methods.getValues()),
    [methods],
  )

  useEffect(() => {
    serializeRef.current = serialize
  }, [serialize])

  const performSave = useCallback(async () => {
    if (!dirtyRef.current) return
    const snapshot = serialize()
    setStatus('saving')
    try {
      const result = await saveLoanCreationDraft(snapshot)
      lastSavedRef.current = snapshot
      const at = result ? Date.parse(result.updatedAt) || Date.now() : Date.now()
      writeDraftLocal(key, methods.getValues(), at)
      if (serialize() === snapshot) {
        dirtyRef.current = false
      }
      setSavedAt(at)
      setErrorMessage(null)
      setStatus('saved')
    } catch (e) {
      const message =
        extractValidationMessage(e) ??
        "Couldn't save your draft to the server. Your work is kept on this device."
      setErrorMessage(message)
      setStatus('error')
    }
  }, [key, methods, serialize])

  const scheduleSave = useCallback(() => {
    cancelTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void performSave()
    }, debounceMs)
  }, [cancelTimer, debounceMs, performSave])

  useEffect(() => {
    if (!enabled) return
    cancelTimer()
    touchedRef.current = false
    dirtyRef.current = false
    lastSavedRef.current = ''
    const requestId = ++hydrationRef.current

    getLoanCreationDraft()
      .then(async (draft) => {
        if (hydrationRef.current !== requestId) return
        const values = draft?.payload ? parsePayload(draft.payload) : null

        if (values) {
          const at = Date.parse(draft!.updatedAt) || Date.now()
          let next = { ...EMPTY_FORM, ...values } as LoanApplicationFormData
          const cisId = next.client?.cisId
          if (cisId) {
            try {
              const webloan = await getWebLoanByCis(cisId)
              if (hydrationRef.current !== requestId) return
              next = applyWebLoanClientOverlay(next, webloan, (code) =>
                findBranchName(branchesRef.current, code),
              )
            } catch {
              /* keep the restored draft when WebLoan is unavailable */
            }
          }

          if (!touchedRef.current) {
            lastSavedRef.current = JSON.stringify(next)
            skipNextWatchRef.current = true
            methods.reset(next)
            writeDraftLocal(key, next, at)
            setSavedAt(at)
            setStatus('saved')
            setErrorMessage(null)
            toastInfo('Draft restored from the server.')
            if (cisId) {
              // Overlay refreshed WebLoan fields — persist the merged snapshot.
              dirtyRef.current = true
              lastSavedRef.current = ''
              scheduleSave()
            }
          } else {
            dirtyRef.current = true
            setStatus('idle')
            scheduleSave()
          }
          return
        }

        const local = readDraft(key)
        if (local?.values && !touchedRef.current) {
          lastSavedRef.current = JSON.stringify(local.values)
          skipNextWatchRef.current = true
          methods.reset(local.values as LoanApplicationFormData)
          setSavedAt(local.savedAt)
          setStatus('idle')
          dirtyRef.current = true
          scheduleSave()
          toastInfo('Draft restored from this device.')
          return
        }

        setStatus('idle')
      })
      .catch(() => {
        if (hydrationRef.current !== requestId) return
        const local = readDraft(key)
        if (local?.values && !touchedRef.current) {
          lastSavedRef.current = JSON.stringify(local.values)
          skipNextWatchRef.current = true
          methods.reset(local.values as LoanApplicationFormData)
          setSavedAt(local.savedAt)
          setStatus('idle')
          setErrorMessage(
            'Saved draft unavailable — restored the copy from this device. It will sync automatically.',
          )
          dirtyRef.current = true
          scheduleSave()
          return
        }
        setStatus('idle')
        setErrorMessage("Couldn't load your saved draft — start typing to save a new one.")
      })
  }, [enabled, key, methods, cancelTimer, scheduleSave])

  useEffect(() => {
    if (!enabled) return
    const sub = methods.watch(() => {
      if (skipNextWatchRef.current) {
        skipNextWatchRef.current = false
        return
      }
      touchedRef.current = true
      const snapshot = serialize()
      if (snapshot === lastSavedRef.current) {
        dirtyRef.current = false
        cancelTimer()
        return
      }
      dirtyRef.current = true
      writeDraftLocal(key, methods.getValues(), Date.now())
      scheduleSave()
    })
    return () => {
      sub.unsubscribe()
      cancelTimer()
    }
  }, [enabled, key, methods, serialize, scheduleSave, cancelTimer])

  const discardDraft = useCallback(() => {
    cancelTimer()
    touchedRef.current = false
    dirtyRef.current = false
    lastSavedRef.current = ''
    removeDraftLocal(key)
    setSavedAt(null)
    setErrorMessage(null)
    setStatus('idle')
    void deleteLoanCreationDraft().catch(() => {})
  }, [cancelTimer, key])

  const clearDraft = useCallback(() => {
    cancelTimer()
    touchedRef.current = false
    dirtyRef.current = false
    lastSavedRef.current = ''
    skipNextWatchRef.current = true
    removeDraftLocal(key)
    methods.reset(EMPTY_FORM)
    setSavedAt(null)
    setErrorMessage(null)
    setStatus('idle')
    void deleteLoanCreationDraft().catch(() => {})
    toastSuccess('Form cleared.')
  }, [cancelTimer, key, methods])

  const retry = useCallback(() => {
    dirtyRef.current = true
    cancelTimer()
    void performSave()
  }, [cancelTimer, performSave])

  useEffect(() => {
    if (!enabled) return

    const flush = () => {
      if (dirtyRef.current) {
        saveLoanCreationDraftKeepalive(serializeRef.current())
      }
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      } else if (dirtyRef.current) {
        scheduleSave()
      }
    }

    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, serialize, scheduleSave])

  useEffect(
    () => () => {
      if (dirtyRef.current) {
        saveLoanCreationDraftKeepalive(serializeRef.current())
      }
    },
    [],
  )

  return {
    status,
    savedAt,
    errorMessage,
    clearDraft,
    discardDraft,
    retry,
  }
}
