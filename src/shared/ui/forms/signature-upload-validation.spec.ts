import { describe, expect, it } from 'vitest'
import {
  PNG_SIGNATURE_MAX_BYTES,
  isPngFile,
  validatePngSignatureFile,
} from './signature-upload-validation'

function makePngFile(
  name = 'signature.png',
  type = 'image/png',
  size = 1024,
): File {
  const file = new File([new Uint8Array(size)], name, { type })
  return file
}

describe('isPngFile', () => {
  it('accepts png mime and extension', () => {
    expect(isPngFile(makePngFile())).toBe(true)
  })

  it('rejects non-png mime or extension', () => {
    expect(isPngFile(makePngFile('signature.jpg', 'image/jpeg'))).toBe(false)
    expect(isPngFile(makePngFile('signature.png.txt', 'image/png'))).toBe(false)
    expect(isPngFile(makePngFile('signature.png', 'application/octet-stream'))).toBe(
      false,
    )
  })
})

describe('validatePngSignatureFile', () => {
  it('rejects non-png files before any decode work', async () => {
    const result = await validatePngSignatureFile(
      makePngFile('sig.jpg', 'image/jpeg'),
    )
    expect(result).toEqual({
      ok: false,
      code: 'not-png',
      message: 'Choose a PNG image (.png).',
    })
  })

  it('rejects oversized png files', async () => {
    const result = await validatePngSignatureFile(
      makePngFile('sig.png', 'image/png', PNG_SIGNATURE_MAX_BYTES + 1),
    )
    expect(result).toMatchObject({ ok: false, code: 'too-large' })
  })

  it('rejects corrupt images', async () => {
    const bad = new File([new Uint8Array([1, 2, 3, 4])], 'sig.png', {
      type: 'image/png',
    })
    const result = await validatePngSignatureFile(bad)
    expect(result).toMatchObject({ ok: false, code: 'decode-failed' })
  })
})
