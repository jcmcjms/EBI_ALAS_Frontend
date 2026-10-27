import { describe, expect, it } from 'vitest'
import { isSubmittedWithoutUpload } from './checklist-upload-status'

describe('isSubmittedWithoutUpload', () => {
  it('is true for Submitted with no docId', () => {
    expect(
      isSubmittedWithoutUpload({ uploadStatus: 'Submitted', docId: null }),
    ).toBe(true)
  })

  it('is false for Uploaded with a file', () => {
    expect(
      isSubmittedWithoutUpload({ uploadStatus: 'Uploaded', docId: 12 }),
    ).toBe(false)
  })

  it('is false for pending items', () => {
    expect(
      isSubmittedWithoutUpload({
        uploadStatus: 'No uploaded documents',
        docId: null,
      }),
    ).toBe(false)
  })
})
