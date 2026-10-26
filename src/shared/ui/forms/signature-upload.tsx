import { useEffect, useId, useRef, useState } from 'react'
import { ImageSquare, UploadSimple, X } from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import { cn } from '@/src/shared/lib/utils'
import {
  validatePngSignatureFile,
  type SignatureUploadValidationResult,
} from './signature-upload-validation'

export interface SignatureUploadProps {
  value?: string | null
  onChange?: (dataUrl: string | null) => void
  disabled?: boolean
  className?: string
}

export function SignatureUpload({
  value,
  onChange,
  disabled = false,
  className,
}: SignatureUploadProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selectedDataUrl, setSelectedDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const validationSeq = useRef(0)
  const previewUrl = selectedDataUrl ?? value ?? null

  useEffect(() => {
    return () => {
      validationSeq.current += 1
    }
  }, [])

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return

    const seq = ++validationSeq.current
    setIsValidating(true)
    setError(null)

    const result: SignatureUploadValidationResult =
      await validatePngSignatureFile(file)

    if (seq !== validationSeq.current) return

    setIsValidating(false)
    if (!result.ok) {
      setError(result.message)
      return
    }

    setSelectedDataUrl(result.dataUrl)
    onChange?.(result.dataUrl)
  }

  const clear = () => {
    validationSeq.current += 1
    setIsValidating(false)
    setError(null)
    setSelectedDataUrl(null)
    if (inputRef.current) inputRef.current.value = ''
    onChange?.(null)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,.png"
        className="sr-only"
        disabled={disabled || isValidating}
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
        }}
      />

      {previewUrl ? (
        <div className="relative rounded-md border bg-muted/30">
          <img
            src={previewUrl}
            alt="Signature preview"
            className="mx-auto h-28 w-full object-contain p-3"
          />
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1 text-muted-foreground hover:text-destructive"
              onClick={clear}
              aria-label="Remove signature"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || isValidating}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            if (disabled) return
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            if (disabled) return
            e.preventDefault()
            setIsDragging(false)
            void handleFile(e.dataTransfer.files?.[0])
          }}
          className={cn(
            'flex h-28 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/20 text-muted-foreground transition-colors',
            isDragging && 'border-primary bg-primary/5 text-foreground',
            disabled && 'pointer-events-none opacity-60',
          )}
          aria-label="Upload PNG signature"
        >
          <UploadSimple size={18} />
          <span className="text-xs font-medium">Upload PNG signature</span>
          <span className="text-[11px]">Drag and drop or browse · max 2 MB</span>
        </button>
      )}

      {!previewUrl && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isValidating}
          onClick={() => inputRef.current?.click()}
        >
          <ImageSquare size={14} />
          {isValidating ? 'Checking…' : 'Choose PNG'}
        </Button>
      )}

      {previewUrl && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isValidating}
          onClick={() => inputRef.current?.click()}
        >
          Replace
        </Button>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
