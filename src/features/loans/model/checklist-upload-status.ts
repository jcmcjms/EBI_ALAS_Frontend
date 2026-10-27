export function isSubmittedWithoutUpload(item: {
  uploadStatus: string
  docId?: number | null
}): boolean {
  return item.uploadStatus === 'Submitted' && item.docId == null
}
