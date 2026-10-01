import { useCallback, useState } from 'react'
import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { cn } from '@/src/shared/lib/utils'

export interface CurrencyInputProps {
  value: number | undefined

  onChange: (value: number) => void

  suggestedValue?: number

  disabled?: boolean

  className?: string

  showDeviationWarning?: boolean

  'aria-label'?: string
}

function formatPHP(val: number | undefined | null): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return ''
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

function stripNonNumeric(raw: string): string {
  return raw.replace(/[^0-9.]/g, '')
}

function collapseMultipleDots(raw: string): string {
  const firstDot = raw.indexOf('.')
  if (firstDot === -1) return raw
  const head = raw.slice(0, firstDot + 1)
  const tail = raw.slice(firstDot + 1).replace(/\./g, '')
  return head + tail
}

const VALUE_TOLERANCE = 0.01

export function CurrencyInput({
  value,
  onChange,
  suggestedValue,
  disabled,
  className,
  showDeviationWarning = true,
  'aria-label': ariaLabel = 'Currency amount',
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    formatPHP(value),
  )
  const [isFocused, setIsFocused] = useState(false)

  const visibleDisplay = !isFocused ? formatPHP(value) : displayValue

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = collapseMultipleDots(stripNonNumeric(e.target.value))
      setDisplayValue(cleaned)

      if (cleaned === '' || cleaned === '.') {
        onChange(0)
        return
      }
      const parsed = parseFloat(cleaned)
      onChange(Number.isFinite(parsed) ? parsed : 0)
    },
    [onChange],
  )

  const handleFocus = useCallback(() => {
    setIsFocused(true)

    const raw =
      value !== undefined && Number.isFinite(value) ? value.toString() : ''
    setDisplayValue(raw)
  }, [value])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

  const handleReset = useCallback(() => {
    if (suggestedValue === undefined) return
    onChange(suggestedValue)

    setIsFocused(false)
  }, [onChange, suggestedValue])

  const isOverridden =
    suggestedValue !== undefined &&
    value !== undefined &&
    Math.abs(value - suggestedValue) > VALUE_TOLERANCE

  return (
    <div className="space-y-1">
      <div className="relative flex items-center gap-2">
        <span
          className="absolute left-2.5 z-10 text-xs text-muted-foreground pointer-events-none select-none"
          aria-hidden
        >
          ₱
        </span>
        <Input
          type="text"
          inputMode="decimal"
          value={visibleDisplay}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn('pl-6 pr-9 text-right tabular-nums', className)}
        />
        {isOverridden && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 h-6 w-6"
            onClick={handleReset}
            title={`Reset to standard fee (₱${formatPHP(suggestedValue)})`}
            aria-label="Reset to standard fee"
          >
            <ArrowsClockwise className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isOverridden && showDeviationWarning && (
        <p className="flex items-center gap-1 px-1 text-[11px] text-amber-600">
          <WarningCircle className="h-3 w-3" weight="fill" />
          Deviates from standard fee. Justification required for approval.
        </p>
      )}
    </div>
  )
}
