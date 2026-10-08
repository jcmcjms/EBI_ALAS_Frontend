import { apiClient } from '@/src/shared/lib/apiClient'
import {
  unwrapApiData,
  type ApiResponse,
  type LoanProductResponse,
} from '@/src/shared/lib/api/types'
import type {
  LoanProductImportResult,
  LoanProductSyncResult,
  UpdateLoanProductPayload,
} from './loan-product-types'

export type { LoanProductImportResult } from './loan-product-types'

export async function getLoanProducts(): Promise<LoanProductResponse[]> {
  const res =
    await apiClient.get<ApiResponse<LoanProductResponse[]>>(
      '/api/loan-products',
    )
  return unwrapApiData(res.data)
}

export async function getLoanProductByCode(
  code: string,
): Promise<LoanProductResponse | null> {
  const res = await apiClient.get<ApiResponse<LoanProductResponse>>(
    `/api/loan-products/${encodeURIComponent(code)}`,
  )
  return unwrapApiData(res.data)
}

export async function updateLoanProduct(
  code: string,
  payload: UpdateLoanProductPayload,
): Promise<LoanProductResponse> {
  const res = await apiClient.put<ApiResponse<LoanProductResponse>>(
    `/api/loan-products/${encodeURIComponent(code)}`,
    payload,
  )
  return unwrapApiData(res.data)
}

export async function syncLoanProducts(): Promise<LoanProductSyncResult> {
  const res = await apiClient.post<ApiResponse<LoanProductSyncResult>>(
    '/api/loan-products/sync',
  )
  return unwrapApiData(res.data)
}

export async function exportLoanProducts(includeRetired = true): Promise<void> {
  const res = await apiClient.get('/api/loan-products/export', {
    params: { includeRetired },
    responseType: 'blob',
  })

  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `loan-products-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function downloadLoanProductTemplate(): Promise<void> {
  const res = await apiClient.get('/api/loan-products/import/template', {
    responseType: 'blob',
  })

  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'loan-product-import-template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function importLoanProducts(
  file: File,
): Promise<LoanProductImportResult> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await apiClient.post<ApiResponse<LoanProductImportResult>>(
    '/api/loan-products/import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )

  return unwrapApiData(res.data)
}

export function findProductByCode(
  products: LoanProductResponse[] | undefined,
  code: string,
): LoanProductResponse | undefined {
  if (!products || !code) return undefined
  return products.find((p) => p.code === code)
}
