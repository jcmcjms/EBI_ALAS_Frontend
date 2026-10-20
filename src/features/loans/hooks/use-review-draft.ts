import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/src/shared/store/auth-store'
import {
  deleteReviewDraft,
  getReviewDraft,
  saveReviewDraft,
  saveReviewDraftKeepalive,
} from '@/src/features/loans/api/review-draft'

export type ReviewDraftStatus =
  | 'idle'
  | 'hydrating'
  | 'saving'
  | 'saved'
  | 'error'

const DEFAULT_DEBOUNCE_MS = 1_200

function extractValidationMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return null
  const data = error.response.data as
    | { detail?: string; message?: string }
    | undefined
  return data?.detail ?? data?.message ?? null
}

function storageKeyFor(userId: string | undefined, loanId: string): string {
  return `alas:review-draft:${userId ?? 'anon'}:${loanId}`
}

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    /* storage blocked or full — the server copy stays primary */
  }
}

function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

interface DraftState {
  /** Identity of what this state belongs to; '' when inactive. */
  loanKey: string
  value: string
  status: ReviewDraftStatus
  savedAt: number | null
  errorMessage: string | null
}

export interface UseReviewDraftOptions {
  /** Null/empty disables the draft (e.g. invalid route param). */
  loanId: string | null
  /** False while the loan is loading or frozen; nothing hydrates or saves. */
  enabled?: boolean
  debounceMs?: number
}

export interface UseReviewDraftResult {
  value: string
  setValue: (next: string) => void
  status: ReviewDraftStatus
  savedAt: number | null
  errorMessage: string | null
  /** Flush any pending change to the server right away. */
  saveNow: () => void
  /** Discard the draft locally and on the server (after a decision is submitted). */
  clear: () => void
  /** Re-attempt a failed save. */
  retry: () => void
}

/**
 * Auto-saving review remarks for one loan.
 *
 * Server-side draft is the source of truth (survives devices and browsers);
 * localStorage mirrors every keystroke so an offline reviewer never loses
 * text. Saves are debounced, flushed on pagehide/hidden, never toasted, and
 * surfaced through a small status indicator instead.
 */
export function useReviewDraft({
  loanId,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseReviewDraftOptions): UseReviewDraftResult {
  const userId = useAuthStore((s) => s.user?.userId)
  const active = Boolean(loanId) && enabled
  const loanKey = active && loanId ? `${userId ?? 'anon'}:${loanId}` : ''

  const [state, setState] = useState<DraftState>({
    loanKey: '',
    value: '',
    status: 'idle',
    savedAt: null,
    errorMessage: null,
  })

  // Adjust state during render when the target loan changes (React-sanctioned
  // derived-state reset) so stale remarks never leak between applications.
  if (state.loanKey !== loanKey) {
    setState({
      loanKey,
      value: '',
      status: loanKey ? 'hydrating' : 'idle',
      savedAt: null,
      errorMessage: null,
    })
  }

  const valueRef = useRef('')
  const loanIdRef = useRef<string | null>(null)
  const storageKeyRef = useRef<string | null>(null)
  const dirtyRef = useRef(false)
  const touchedRef = useRef(false)
  const lastSavedRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydrationRef = useRef(0)

  useEffect(() => {
    valueRef.current = state.value
  }, [state.value])

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const performSave = useCallback(async () => {
    const id = loanIdRef.current
    if (!id || !dirtyRef.current) return
    const snapshot = valueRef.current
    setState((s) => ({ ...s, status: 'saving' }))
    try {
      const result = await saveReviewDraft(id, snapshot)
      if (loanIdRef.current !== id) return // navigated away mid-flight
      lastSavedRef.current = snapshot
      const savedAt = result ? Date.parse(result.updatedAt) || Date.now() : Date.now()
      if (valueRef.current === snapshot) {
        dirtyRef.current = false
      }
      setState((s) =>
        s.loanKey === loanKey
          ? { ...s, savedAt, errorMessage: null, status: 'saved' }
          : s,
      )
    } catch (e) {
      if (loanIdRef.current !== id) return
      // Surface actionable server validation (e.g. remarks too long);
      // fall back to a reassuring offline message for network failures.
      const message =
        extractValidationMessage(e) ??
        "Couldn't save your draft to the server. Your text is kept on this device."
      setState((s) => ({ ...s, status: 'error', errorMessage: message }))
    }
  }, [loanKey])

  const scheduleSave = useCallback(() => {
    cancelTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void performSave()
    }, debounceMs)
  }, [cancelTimer, debounceMs, performSave])

  // Hydrate whenever the target loan (or availability) changes. All state
  // updates happen in async continuations — no synchronous effect setStates.
  useEffect(() => {
    cancelTimer()
    touchedRef.current = false
    dirtyRef.current = false
    lastSavedRef.current = ''

    if (!loanKey || !loanId) {
      loanIdRef.current = null
      storageKeyRef.current = null
      return
    }

    loanIdRef.current = loanId
    const key = storageKeyFor(userId, loanId)
    storageKeyRef.current = key
    const requestId = ++hydrationRef.current

    getReviewDraft(loanId)
      .then((draft) => {
        if (hydrationRef.current !== requestId) return
        if (draft?.remarks) {
          lastSavedRef.current = draft.remarks
          const savedAt = Date.parse(draft.updatedAt) || Date.now()
          if (!touchedRef.current) {
            writeLocal(key, draft.remarks)
            setState((s) =>
              s.loanKey === loanKey
                ? { ...s, value: draft.remarks, savedAt, status: 'saved' }
                : s,
            )
          } else {
            // Typed before the server answered — keep their text, sync it up.
            dirtyRef.current = true
            setState((s) => (s.loanKey === loanKey ? { ...s, savedAt, status: 'idle' } : s))
            scheduleSave()
          }
          return
        }

        const local = readLocal(key)
        if (local && !touchedRef.current) {
          // Local copy from an offline session: adopt and re-sync to server.
          dirtyRef.current = true
          setState((s) =>
            s.loanKey === loanKey ? { ...s, value: local, status: 'idle' } : s,
          )
          scheduleSave()
          return
        }
        setState((s) => (s.loanKey === loanKey ? { ...s, status: 'idle' } : s))
      })
      .catch(() => {
        if (hydrationRef.current !== requestId) return
        const local = readLocal(key)
        if (local && !touchedRef.current) {
          dirtyRef.current = true
          setState((s) =>
            s.loanKey === loanKey
              ? {
                  ...s,
                  value: local,
                  status: 'idle',
                  errorMessage:
                    'Saved draft unavailable — restored the copy from this device. It will sync automatically.',
                }
              : s,
          )
          // Re-sync the recovered copy as soon as the server is reachable.
          scheduleSave()
          return
        }
        setState((s) =>
          s.loanKey === loanKey
            ? {
                ...s,
                status: 'idle',
                errorMessage:
                  "Couldn't load your saved draft — start typing to save a new one.",
              }
            : s,
        )
      })
  }, [loanKey, loanId, userId, cancelTimer, scheduleSave])

  const setValue = useCallback(
    (next: string) => {
      touchedRef.current = true
      valueRef.current = next
      setState((s) => ({ ...s, value: next }))
      if (storageKeyRef.current) writeLocal(storageKeyRef.current, next)
      if (!loanIdRef.current) return
      dirtyRef.current = next !== lastSavedRef.current
      if (dirtyRef.current) {
        scheduleSave()
      } else {
        cancelTimer()
      }
    },
    [scheduleSave, cancelTimer],
  )

  const saveNow = useCallback(() => {
    cancelTimer()
    void performSave()
  }, [cancelTimer, performSave])

  const retry = useCallback(() => {
    dirtyRef.current = true
    cancelTimer()
    void performSave()
  }, [cancelTimer, performSave])

  const clear = useCallback(() => {
    cancelTimer()
    const id = loanIdRef.current
    const key = storageKeyRef.current
    touchedRef.current = false
    dirtyRef.current = false
    lastSavedRef.current = ''
    valueRef.current = ''
    setState((s) => ({
      ...s,
      value: '',
      savedAt: null,
      errorMessage: null,
      status: 'idle',
    }))
    if (key) removeLocal(key)
    if (id) void deleteReviewDraft(id).catch(() => {})
  }, [cancelTimer])

  // Flush pending text when the page is torn down or backgrounded.
  useEffect(() => {
    if (!loanKey) return

    const flush = () => {
      if (dirtyRef.current && loanIdRef.current) {
        saveReviewDraftKeepalive(loanIdRef.current, valueRef.current)
      }
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      } else if (dirtyRef.current) {
        // Came back — reconcile with the server instead of trusting keepalive.
        scheduleSave()
      }
    }

    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loanKey, scheduleSave])

  // Last-resort flush on unmount (SPA navigation away from the loan).
  useEffect(
    () => () => {
      if (dirtyRef.current && loanIdRef.current) {
        saveReviewDraftKeepalive(loanIdRef.current, valueRef.current)
      }
    },
    [],
  )

  return {
    value: state.value,
    setValue,
    status: state.status,
    savedAt: state.savedAt,
    errorMessage: state.errorMessage,
    saveNow,
    clear,
    retry,
  }
}
