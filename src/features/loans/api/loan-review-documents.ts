import { apiClient } from '@/src/shared/lib/apiClient'
import {
  unwrapApiData,
  type ApiResponse,
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
  id: number,
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
  id: number,
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
  id: number,
): Promise<LoanChecklistDocumentDto[]> {
  const res = await apiClient.get<ApiResponse<LoanChecklistDocumentDto[]>>(
    `/api/loans/${id}/checklist-documents`,
  )
  return unwrapApiData(res.data)
}

export async function getDocumentRemarks(
  loanId: number,
): Promise<DocumentRemarkDto[]> {
  const res = await apiClient.get<ApiResponse<DocumentRemarkDto[]>>(
    `/api/loans/${loanId}/document-remarks`,
  )
  return unwrapApiData(res.data)
}

export async function postDocumentRemark(
  loanId: number,
  payload: {
    checklistIdCode: string
    docId?: number | null
    parentRemarkId?: number | null
    body: string
  },
): Promise<DocumentRemarkDto> {
  const res = await apiClient.post<ApiResponse<DocumentRemarkDto>>(
    `/api/loans/${loanId}/document-remarks`,
    payload,
  )
  return unwrapApiData(res.data)
}

export async function getDocumentChecklist(
  loanId: number,
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
  id: number,
  page: number,
  pageSize: number,
): Promise<PagedResult<TimelineEvent>> {
  const res = await apiClient.get<ApiResponse<PagedResult<TimelineEvent>>>(
    `/api/loans/${id}/timeline`,
    { params: { page, pageSize } },
  )
  return unwrapApiData(res.data)
}

export async function getLoanDeviations(
  id: number,
): Promise<LoanDeviationDto[]> {
  const res = await apiClient.get<ApiResponse<LoanDeviationDto[]>>(
    `/api/loans/${id}/deviations`,
  )
  return unwrapApiData(res.data)
}

export async function postDeviationRemark(
  loanId: number,
  deviationId: number,
  payload: { body: string; parentRemarkId?: number | null },
): Promise<DeviationRemarkDto> {
  const res = await apiClient.post<ApiResponse<DeviationRemarkDto>>(
    `/api/loans/${loanId}/deviations/${deviationId}/remarks`,
    payload,
  )
  return unwrapApiData(res.data)
}