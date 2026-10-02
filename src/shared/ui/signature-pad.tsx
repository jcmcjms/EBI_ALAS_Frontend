import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, Path } from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/button'
import { cn } from '@/src/shared/lib/utils'

export interface SignaturePadProps {
  value?: string | null

  onChange?: (base64: string | null) => void

  heightClassName?: string

  disabled?: boolean
}

export function SignaturePad({
  value,
  onChange,
  heightClassName = 'h-32',
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const isInitializedRef = useRef(false)
  const [isDrawing, setIsDrawing] = useState(false)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()

    if (rect.width === 0 || rect.height === 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [])

  const seedFromValue = useCallback((src: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height)
    }
    img.src = src
  }, [])

  useEffect(() => {
    if (isInitializedRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    resizeCanvas()
    if (value) seedFromValue(value)
    isInitializedRef.current = true
  }, [value, resizeCanvas, seedFromValue])

  useEffect(() => {
    if (!isInitializedRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    if (value) {
      ctx.clearRect(0, 0, rect.width, rect.height)
      seedFromValue(value)
    }
  }, [value])

  const getCoordinates = (
    e:
      React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
    return { x: 0, y: 0 }
  }

  const startDrawing = (
    e:
      React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (disabled) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (
    e:
      React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const endDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas || !onChange) return
    onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    onChange?.(null)
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative rounded-md border bg-background',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            'block w-full touch-none cursor-crosshair',
            heightClassName,
          )}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
        {}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1 text-muted-foreground hover:text-destructive"
          onClick={clear}
          aria-label="Clear signature"
          disabled={disabled}
        >
          <Eraser size={14} />
        </Button>
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Path size={12} />
        Draw your signature above. The image is stored as a small PNG alongside
        your profile.
      </p>
    </div>
  )
}
