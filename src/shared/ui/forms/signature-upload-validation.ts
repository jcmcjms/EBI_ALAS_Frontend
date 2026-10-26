export const PNG_SIGNATURE_MAX_BYTES = 2 * 1024 * 1024
export const PNG_SIGNATURE_MIN_WIDTH = 32
export const PNG_SIGNATURE_MIN_HEIGHT = 16
export const PNG_SIGNATURE_MAX_WIDTH = 4096
export const PNG_SIGNATURE_MAX_HEIGHT = 4096

export type SignatureUploadValidationErrorCode =
  | 'not-png'
  | 'too-large'
  | 'decode-failed'
  | 'dimensions'

export type SignatureUploadValidationResult =
  | { ok: true; dataUrl: string; width: number; height: number }
  | { ok: false; code: SignatureUploadValidationErrorCode; message: string }

const PNG_MIME = 'image/png'
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export function isPngFile(file: File): boolean {
  return file.type === PNG_MIME && /\.png$/i.test(file.name)
}

export async function validatePngSignatureFile(
  file: File,
): Promise<SignatureUploadValidationResult> {
  if (!isPngFile(file)) {
    return {
      ok: false,
      code: 'not-png',
      message: 'Choose a PNG image (.png).',
    }
  }

  if (file.size > PNG_SIGNATURE_MAX_BYTES) {
    return {
      ok: false,
      code: 'too-large',
      message: 'PNG must be 2 MB or smaller.',
    }
  }

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    return {
      ok: false,
      code: 'decode-failed',
      message: 'The file could not be read.',
    }
  }

  const bytes = new Uint8Array(buffer)
  if (!hasPngMagic(bytes)) {
    return {
      ok: false,
      code: 'decode-failed',
      message: 'The PNG is invalid or corrupted.',
    }
  }

  const dimensions = readPngIhdrDimensions(bytes)
  if (!dimensions) {
    return {
      ok: false,
      code: 'decode-failed',
      message: 'The PNG is invalid or corrupted.',
    }
  }

  const { width, height } = dimensions
  if (
    width < PNG_SIGNATURE_MIN_WIDTH ||
    height < PNG_SIGNATURE_MIN_HEIGHT ||
    width > PNG_SIGNATURE_MAX_WIDTH ||
    height > PNG_SIGNATURE_MAX_HEIGHT
  ) {
    return {
      ok: false,
      code: 'dimensions',
      message: `Image must be between ${PNG_SIGNATURE_MIN_WIDTH}×${PNG_SIGNATURE_MIN_HEIGHT} and ${PNG_SIGNATURE_MAX_WIDTH}×${PNG_SIGNATURE_MAX_HEIGHT} pixels.`,
    }
  }

  const dataUrl = `data:image/png;base64,${arrayBufferToBase64(buffer)}`
  return { ok: true, dataUrl, width, height }
}

function hasPngMagic(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_MAGIC.length) return false
  return PNG_MAGIC.every((b, i) => bytes[i] === b)
}

function readPngIhdrDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  // PNG signature (8) + length (4) + "IHDR" (4) + width (4) + height (4)
  if (bytes.length < 24) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])
  if (chunkType !== 'IHDR') return null
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
