import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import {
  type BackendPageResult,
  mapPageResult,
} from '@/src/shared/lib/api/types'
import { getErrorMessage, isCsrfError } from '@/src/shared/lib/apiClient'

function makeAxiosError(
  status: number,
  data: unknown,
  message = 'Request failed',
): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  const response = {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  } as AxiosResponse
  return new AxiosError(message, 'ERR_BAD_REQUEST', config, {}, response)
}

describe('mapPageResult', () => {
  const backendPage: BackendPageResult<string> = {
    items: ['a', 'b'],
    totalCount: 42,
    page: 2,
    pageSize: 20,
    totalPages: 3,
  }

  it('maps backend page to UI currentPage', () => {
    const result = mapPageResult(backendPage)
    expect(result.currentPage).toBe(2)
  })

  it('preserves items, pageSize, totalCount, and totalPages', () => {
    const result = mapPageResult(backendPage)
    expect(result.items).toEqual(['a', 'b'])
    expect(result.pageSize).toBe(20)
    expect(result.totalCount).toBe(42)
    expect(result.totalPages).toBe(3)
  })

  it('derives hasPreviousPage from page > 1', () => {
    expect(mapPageResult(backendPage).hasPreviousPage).toBe(true)
    expect(
      mapPageResult({ ...backendPage, page: 1 }).hasPreviousPage,
    ).toBe(false)
  })

  it('derives hasNextPage from page < totalPages', () => {
    expect(mapPageResult(backendPage).hasNextPage).toBe(true)
    expect(
      mapPageResult({ ...backendPage, page: 3 }).hasNextPage,
    ).toBe(false)
  })

  it('marks a single-page result as having neither previous nor next', () => {
    const result = mapPageResult({
      items: ['only'],
      totalCount: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
    expect(result.hasPreviousPage).toBe(false)
    expect(result.hasNextPage).toBe(false)
  })
})

describe('isCsrfError', () => {
  it('detects CSRF from ProblemDetails title and detail on 403', () => {
    const error = makeAxiosError(403, {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.4',
      title: 'CSRF validation failed',
      status: 403,
      detail: 'Missing or invalid X-XSRF-TOKEN header.',
      instance: '/api/users',
    })
    expect(isCsrfError(error)).toBe(true)
  })

  it('detects CSRF from a plain-text 403 body', () => {
    const error = makeAxiosError(403, 'CSRF token missing')
    expect(isCsrfError(error)).toBe(true)
  })

  it('returns false for non-403 status even when text mentions CSRF', () => {
    const error = makeAxiosError(400, {
      title: 'CSRF validation failed',
      detail: 'Missing or invalid X-XSRF-TOKEN header.',
    })
    expect(isCsrfError(error)).toBe(false)
  })

  it('returns false for 403 without CSRF in title/detail/message', () => {
    const error = makeAxiosError(403, {
      title: 'Forbidden',
      detail: 'You do not have permission to perform this action.',
    })
    expect(isCsrfError(error)).toBe(false)
  })

  it('returns false when the error has no response', () => {
    const error = new AxiosError('Network error', 'ERR_NETWORK')
    expect(isCsrfError(error)).toBe(false)
  })

  it('returns false for non-axios errors', () => {
    expect(isCsrfError(new Error('CSRF'))).toBe(false)
    expect(isCsrfError(null)).toBe(false)
    expect(isCsrfError(undefined)).toBe(false)
    expect(isCsrfError('CSRF')).toBe(false)
  })

  it('does not rely on a code field the backend does not send', () => {
    const error = makeAxiosError(403, {
      title: 'CSRF validation failed',
      detail: 'Missing or invalid X-XSRF-TOKEN header.',
    })
    expect(isCsrfError(error)).toBe(true)
  })
})

describe('getErrorMessage with ProblemDetails', () => {
  it('prefers ProblemDetails detail over message', () => {
    const error = makeAxiosError(400, {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
      title: 'One or more validation errors occurred.',
      status: 400,
      detail: 'The loan amount exceeds the product maximum.',
      message: 'Validation failed',
    })
    expect(getErrorMessage(error)).toBe(
      'The loan amount exceeds the product maximum.',
    )
  })

  it('returns ProblemDetails detail as-is when it already lists missing documents', () => {
    const error = makeAxiosError(400, {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
      title: 'Missing required documents',
      status: 400,
      detail:
        'Cannot submit the application. Required documents are missing:\n' +
        '• CIBI Report is missing\n' +
        '• Bank Statement is missing\n' +
        'Upload them in the checklist, then try again.',
      errors: ['CIBI Report is missing', 'Bank Statement is missing'],
    })
    expect(getErrorMessage(error)).toBe(
      'Cannot submit the application. Required documents are missing:\n' +
        '• CIBI Report is missing\n' +
        '• Bank Statement is missing\n' +
        'Upload them in the checklist, then try again.',
    )
  })

  it('formats errors list under detail when detail is only a summary', () => {
    const error = makeAxiosError(400, {
      title: 'Missing required documents',
      status: 400,
      detail: 'Required documents are missing.',
      errors: ['CIBI Report is missing'],
    })
    expect(getErrorMessage(error)).toBe(
      'Required documents are missing.\n• CIBI Report is missing',
    )
  })

  it('falls back to message with errors when detail is absent', () => {
    const error = makeAxiosError(400, {
      message: 'Validation failed',
      errors: ['Amount is required', 'Term is required'],
    })
    expect(getErrorMessage(error)).toBe(
      'Validation failed: Amount is required. Term is required',
    )
  })

  it('falls back to error field when detail and message are absent', () => {
    const error = makeAxiosError(400, { error: 'Bad request' })
    expect(getErrorMessage(error)).toBe('Bad request')
  })
})
