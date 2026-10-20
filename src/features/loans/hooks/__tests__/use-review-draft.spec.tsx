import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAuthStore } from '@/src/shared/store/auth-store'

import { useReviewDraft } from '../use-review-draft'
import * as draftApi from '@/src/features/loans/api/review-draft'

vi.mock('@/src/features/loans/api/review-draft', () => ({
  getReviewDraft: vi.fn(),
  saveReviewDraft: vi.fn(),
  deleteReviewDraft: vi.fn(),
  saveReviewDraftKeepalive: vi.fn(),
}))

const getReviewDraft = vi.mocked(draftApi.getReviewDraft)
const saveReviewDraft = vi.mocked(draftApi.saveReviewDraft)
const deleteReviewDraft = vi.mocked(draftApi.deleteReviewDraft)
const saveReviewDraftKeepalive = vi.mocked(draftApi.saveReviewDraftKeepalive)

const LOAN_ID = 'loan-1'
const STORAGE_KEY = 'alas:review-draft:user-1:loan-1'

function setAuthUser() {
  useAuthStore.setState({
    user: {
      userId: 'user-1',
      firstName: 'Eva',
      middleName: '',
      lastName: 'Luator',
      branchId: '001',
      role: 'Evaluator',
      jobTitle: 'Credit Checker',
      permissions: ['*'],
      mustChangePassword: false,
    },
  })
}

describe('useReviewDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    window.localStorage.clear()
    setAuthUser()
    getReviewDraft.mockResolvedValue(null)
    saveReviewDraft.mockImplementation(async (_id, remarks) => ({
      remarks,
      updatedAt: new Date().toISOString(),
    }))
    deleteReviewDraft.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setup(enabled = true) {
    return renderHook(() => useReviewDraft({ loanId: LOAN_ID, enabled }))
  }

  it('hydrates the server draft on mount', async () => {
    getReviewDraft.mockResolvedValue({
      remarks: 'verify payslips',
      updatedAt: '2026-10-20T02:00:00Z',
    })

    const { result } = setup()

    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(result.current.value).toBe('verify payslips')
    expect(result.current.savedAt).toBe(Date.parse('2026-10-20T02:00:00Z'))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('verify payslips')
  })

  it('saves debounced after typing and mirrors to localStorage', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      result.current.setValue('capacity is sufficient')
    })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      'capacity is sufficient',
    )
    expect(saveReviewDraft).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1_300)
    })

    expect(saveReviewDraft).toHaveBeenCalledWith(
      LOAN_ID,
      'capacity is sufficient',
    )
    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(result.current.savedAt).not.toBeNull()
  })

  it('does not save when the text matches the last saved draft', async () => {
    getReviewDraft.mockResolvedValue({
      remarks: 'same text',
      updatedAt: '2026-10-20T02:00:00Z',
    })
    const { result } = setup()
    await waitFor(() => expect(result.current.value).toBe('same text'))

    act(() => {
      result.current.setValue('same text')
    })
    await act(async () => {
      vi.advanceTimersByTime(1_500)
    })

    expect(saveReviewDraft).not.toHaveBeenCalled()
  })

  it('reports error state, keeps the local copy, and recovers on retry', async () => {
    saveReviewDraft.mockRejectedValueOnce(new Error('offline'))
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      result.current.setValue('findings pending')
    })
    await act(async () => {
      vi.advanceTimersByTime(1_300)
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.value).toBe('findings pending')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('findings pending')

    await act(async () => {
      result.current.retry()
    })
    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(saveReviewDraft).toHaveBeenLastCalledWith(
      LOAN_ID,
      'findings pending',
    )
  })

  it('restores the local copy when the server draft is unreachable', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'offline notes')
    getReviewDraft.mockRejectedValueOnce(new Error('network down'))

    const { result } = setup()

    await waitFor(() => expect(result.current.value).toBe('offline notes'))
    expect(result.current.errorMessage).toMatch(/restored the copy/i)

    // The restored copy is pushed back to the server automatically.
    await act(async () => {
      vi.advanceTimersByTime(1_300)
    })
    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(saveReviewDraft).toHaveBeenCalledWith(LOAN_ID, 'offline notes')
  })

  it('clear() wipes value, storage and the server draft', async () => {
    getReviewDraft.mockResolvedValue({
      remarks: 'stale notes',
      updatedAt: '2026-10-20T02:00:00Z',
    })
    const { result } = setup()
    await waitFor(() => expect(result.current.value).toBe('stale notes'))

    await act(async () => {
      result.current.clear()
    })

    expect(result.current.value).toBe('')
    expect(result.current.status).toBe('idle')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(deleteReviewDraft).toHaveBeenCalledWith(LOAN_ID)
  })

  it('flushes unsaved text with keepalive on pagehide', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('idle'))

    act(() => {
      result.current.setValue('half typed remark')
    })
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    expect(saveReviewDraftKeepalive).toHaveBeenCalledWith(
      LOAN_ID,
      'half typed remark',
    )
  })

  it('stays inert while disabled', async () => {
    const { result } = setup(false)

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })

    expect(getReviewDraft).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })
})
