import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

vi.mock('@/src/features/loans/api/loan-creation-draft', () => ({
  getLoanCreationDraft: vi.fn(),
  saveLoanCreationDraft: vi.fn(),
  deleteLoanCreationDraft: vi.fn(),
  saveLoanCreationDraftKeepalive: vi.fn(),
}))

vi.mock('@/src/features/loans/api/webloans', () => ({
  getWebLoanByCis: vi.fn(),
}))

vi.mock('@/src/shared/lib/api/branches', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/shared/lib/api/branches')>()
  return {
    ...actual,
    useBranches: () => ({
      data: [{ code: '001', name: 'Main Branch', status: 'Open' }],
    }),
  }
})

import {
  getLoanCreationDraft,
  saveLoanCreationDraft,
  deleteLoanCreationDraft,
} from '@/src/features/loans/api/loan-creation-draft'
import { getWebLoanByCis } from '@/src/features/loans/api/webloans'
import { useLoanCreationDraft } from '../use-loan-creation-draft'

const KEY = 'alas:loan-creation-draft:user-1'

const emptyDefaults = {
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
  loanType: 'New',
} as unknown as LoanApplicationFormData

const mockGet = vi.mocked(getLoanCreationDraft)
const mockSave = vi.mocked(saveLoanCreationDraft)
const mockDelete = vi.mocked(deleteLoanCreationDraft)
const mockCis = vi.mocked(getWebLoanByCis)

function makeForm() {
  return renderHook(() => {
    const methods = useForm<LoanApplicationFormData>({
      defaultValues: emptyDefaults,
    })
    const draft = useLoanCreationDraft({
      methods,
      userId: 'user-1',
      debounceMs: 0,
    })
    return { methods, draft }
  })
}

function serverDraft(values: Partial<LoanApplicationFormData>) {
  return {
    payload: JSON.stringify({ ...emptyDefaults, ...values }),
    updatedAt: new Date().toISOString(),
  }
}

describe('useLoanCreationDraft', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockGet.mockResolvedValue(null)
    mockSave.mockResolvedValue(null)
    mockDelete.mockResolvedValue(undefined)
    mockCis.mockRejectedValue(new Error('offline'))
  })

  it('restores a server draft into the form on mount', async () => {
    mockGet.mockResolvedValue(
      serverDraft({
        client: {
          ...emptyDefaults.client,
          cisId: 'C-1',
          firstName: 'Ana',
          lastName: 'Cruz',
        },
      } as Partial<LoanApplicationFormData>),
    )

    const { result } = makeForm()
    await waitFor(() => {
      expect(result.current.methods.getValues('client.firstName')).toBe('Ana')
    })
    expect(result.current.draft.status).toBe('saved')
  })

  it('debounces form changes into a server save and local mirror', async () => {
    mockSave.mockResolvedValue({
      payload: '{}',
      updatedAt: new Date().toISOString(),
    })

    const { result } = makeForm()
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })

    act(() => {
      result.current.methods.setValue('client.firstName', 'Juan')
    })
    await act(async () => {
      vi.advanceTimersByTime(0)
    })
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled()
    })
    expect(window.localStorage.getItem(KEY)).toContain('Juan')
    await waitFor(() => {
      expect(result.current.draft.status).toBe('saved')
    })
  })

  it('falls back to the local mirror when the server draft cannot load', async () => {
    mockGet.mockRejectedValue(new Error('network'))
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        values: {
          ...emptyDefaults,
          client: {
            ...emptyDefaults.client,
            cisId: 'C-1',
            firstName: 'Local',
            lastName: 'Copy',
          },
        },
        savedAt: Date.now(),
      }),
    )
    mockSave.mockResolvedValue({
      payload: '{}',
      updatedAt: new Date().toISOString(),
    })

    const { result } = makeForm()
    await waitFor(() => {
      expect(result.current.methods.getValues('client.firstName')).toBe('Local')
    })
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled()
    })
  })

  it('overlays WebLoan client fields and LAI only when restoring a CIS draft', async () => {
    mockGet.mockResolvedValue(
      serverDraft({
        client: {
          ...emptyDefaults.client,
          cisId: 'C-1',
          firstName: 'Stale',
        },
        loans: [
          {
            loanNo: 'LN-1',
            productCode: 'P1',
            productDescription: 'Salary',
            creationTypeCode: 1,
            creationTypeLabel: 'New',
            branchCode: '001',
            parameters: {},
            ebiReloans: [],
            buyOuts: [],
            incomingLoans: [],
            outstandingLoans: [],
            verification: {},
            deviations: {},
          },
        ] as never,
        preLoan: { id: 'PL-1' } as never,
      } as Partial<LoanApplicationFormData>),
    )
    mockCis.mockResolvedValue({
      borrower: {
        cisNo: 'C-1',
        firstName: 'Ana',
        middleName: 'M',
        lastName: 'Cruz',
        title: null,
        appelation: null,
        birthDate: '1990-01-02',
        address: 'Manila',
        agencyType: 'DepEd',
        positionTitle: 'Teacher',
        region: 'NCR',
        regionCode: 'R1',
        divisionCode: 'D1',
        stationCode: 'S1',
        employeeNumber: 'E1',
        misAgency: 'M1',
        requestingOfficer: 'RO-1',
        lengthOfService: '5y',
      },
      accounts: [
        {
          bankCode: 'EBI',
          branchCode: '001',
          accountNo: 'A1',
          accountId: '001-A1',
          name: null,
          creditLimit: null,
          usedCredit: null,
          borrowerType: null,
        },
      ],
    })

    const { result } = makeForm()
    await waitFor(() => {
      expect(result.current.methods.getValues('client.firstName')).toBe('Ana')
    })
    expect(result.current.methods.getValues('client.lastName')).toBe('Cruz')
    expect(result.current.methods.getValues('branchType.lai')).toBe('001-A1')
    expect(result.current.methods.getValues('branchType.branch')).toBe('Main Branch')
    expect(result.current.methods.getValues('branchType.requestingOfficer')).toBe(
      'RO-1',
    )
    expect(result.current.methods.getValues('loans')).toHaveLength(1)
    expect(result.current.methods.getValues('preLoan')).toEqual({ id: 'PL-1' })
  })

  it('keeps the restored draft when the WebLoan overlay fails', async () => {
    mockGet.mockResolvedValue(
      serverDraft({
        client: {
          ...emptyDefaults.client,
          cisId: 'C-1',
          firstName: 'Kept',
        },
      } as Partial<LoanApplicationFormData>),
    )
    mockCis.mockRejectedValue(new Error('webloan down'))

    const { result } = makeForm()
    await waitFor(() => {
      expect(result.current.methods.getValues('client.firstName')).toBe('Kept')
    })
    expect(mockCis).toHaveBeenCalledWith('C-1')
  })

  it('discardDraft removes local storage and deletes the server draft', async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ values: emptyDefaults, savedAt: 1 }),
    )
    const { result } = makeForm()
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })
    act(() => {
      result.current.draft.discardDraft()
    })
    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(mockDelete).toHaveBeenCalled()
  })

  it('clearDraft resets fields and removes storage', async () => {
    const { result } = makeForm()
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })
    act(() => {
      result.current.methods.setValue('client.firstName', 'Temp')
    })
    act(() => {
      result.current.draft.clearDraft()
    })
    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(result.current.methods.getValues('client.firstName')).toBe('')
    expect(mockDelete).toHaveBeenCalled()
  })
})
