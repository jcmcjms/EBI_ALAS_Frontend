import { apiClient } from '@/src/shared/lib/apiClient'
import {
  unwrapApiData,
  mapPageResult,
  type ApiResponse,
  type BackendPageResult,
  type PagedResult,
} from '@/src/shared/lib/api/types'
import type {
  LoanAttachmentDto,
  LoanChecklistDocumentDto,
  DocumentRemarkDto,
  DocumentChecklistItem,
  DeviationRemarkDto,
  LoanDeviationDto,
  TimelineEvent,
} from './loan-review-types'

export async function getLoanAttachments(
  id: number | string,
): Promise<LoanAttachmentDto[]> {
  const res = await apiClient.get<ApiResponse<LoanAttachmentDto[]>>(
    `/api/loans/${id}/attachments`,
  )
  return unwrapApiData(res.data)
}

export async function viewChecklistDocument(docId: number, fileName: string) {
  const res = await apiClient.get(
    `/api/loans/checklist-documents/${docId}/view`,
    { responseType: 'blob' },
  )
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export async function uploadLoanAttachment(
  id: number | string,
  file: File,
  category: string | null,
  onProgress?: (pct: number) => void,
): Promise<LoanAttachmentDto> {
  const form = new FormData()
  form.append('file', file)
  if (category) form.append('category', category)
  const res = await apiClient.post<ApiResponse<LoanAttachmentDto>>(
    `/api/loans/${id}/attachments`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) =>
        onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    },
  )
  return unwrapApiData(res.data)
}

export async function downloadLoanAttachment(
  attachmentId: number,
  fileName: string,
) {
  const res = await apiClient.get(
    `/api/loans/attachments/${attachmentId}/download`,
    { responseType: 'blob' },
  )
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export async function deleteLoanAttachment(
  attachmentId: number,
): Promise<void> {
  await apiClient.delete(`/api/loans/attachments/${attachmentId}`)
}

export async function getChecklistDocuments(
  id: number | string,
): Promise<LoanChecklistDocumentDto[]> {
  const res = await apiClient.get<LoanChecklistDocumentDto[]>(
    `/api/loans/${id}/checklist-documents`,
  )
  return Array.isArray(res.data) ? res.data : []
}

export async function getDocumentRemarks(
  loanId: number | string,
): Promise<DocumentRemarkDto[]> {
  const res = await apiClient.get<DocumentRemarkDto[]>(
    `/api/loans/${loanId}/document-remarks`,
  )
  return Array.isArray(res.data) ? res.data : []
}

export async function postDocumentRemark(
  loanId: number | string,
  payload: {
    checklistIdCode: string
    docId?: number | null
    parentRemarkId?: string | null
    body: string
  },
): Promise<DocumentRemarkDto> {
  const res = await apiClient.post<DocumentRemarkDto>(
    `/api/loans/${loanId}/document-remarks`,
    payload,
  )
  return res.data
}

export async function getDocumentChecklist(
  loanId: number | string,
): Promise<DocumentChecklistItem[]> {
  const res = await apiClient.get<ApiResponse<DocumentChecklistItem[]>>(
    `/api/loans/${loanId}/checklist-documents`,
  )
  return unwrapApiData(res.data)
}

export function canPreviewInline(contentType: string | null): boolean {
  if (!contentType) return false
  return contentType.startsWith('image/') || contentType === 'application/pdf'
}

export async function fetchChecklistDocument(
  docId: number,
): Promise<{ url: string; contentType: string | null }> {
  const res = await apiClient.get(
    `/api/loans/checklist-documents/${docId}/view`,
    { responseType: 'blob' },
  )
  const blob = res.data as Blob
  return {
    url: URL.createObjectURL(blob),
    contentType: blob.type || null,
  }
}

export async function getLoanTimeline(
  id: number | string,
  page: number,
  pageSize: number,
): Promise<PagedResult<TimelineEvent>> {
  const res = await apiClient.get<BackendPageResult<TimelineEvent>>(
    `/api/loans/${id}/timeline`,
    { params: { page, pageSize } },
  )
  return mapPageResult(res.data)
}

export async function getLoanDeviations(
  id: number | string,
): Promise<LoanDeviationDto[]> {
  const res = await apiClient.get<LoanDeviationDto[]>(
    `/api/loans/${id}/deviations`,
  )
  return Array.isArray(res.data) ? res.data : []
}

export async function postDeviationRemark(
  loanId: number | string,
  deviationId: string | number,
  payload: { body: string; parentRemarkId?: string | null },
): Promise<DeviationRemarkDto> {
  const res = await apiClient.post<DeviationRemarkDto>(
    `/api/loans/${loanId}/deviations/${deviationId}/remarks`,
    payload,
  )
  return res.data
}

/**
 * Ask the encoder to update/add deviations. Routes through push-back with only
 * the Deviations section so the encoder gets the revise form with selection +
 * justifications unlocked.
 */
export async function requestDeviationUpdate(
  loanId: number | string,
  instructions: string,
): Promise<void> {
  await apiClient.post(`/api/loans/${loanId}/deviation-update-request`, {
    instructions,
  })
}
