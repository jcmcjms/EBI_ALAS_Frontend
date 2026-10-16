import * as React from 'react'
import { CalendarBlank } from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/primitives/button'
import { Calendar } from '@/src/shared/ui/forms/calendar'
import { Field, FieldLabel } from '@/src/shared/ui/forms/field'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/shared/ui/data-display/popover'
import { cn } from '@/src/shared/lib/utils'

export function isoStringToDate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return new Date(year, month - 1, day)
}

export function dateToIsoString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface DatePickerProps {
  id?: string
  label: string
  value: string
  onChange: (isoDate: string) => void
  className?: string
}

export function DatePicker({
  id,
  label,
  value,
  onChange,
  className,
}: DatePickerProps) {
  const selected = isoStringToDate(value)
  const accessibleLabel = label || 'Date'

  return (
    <Field className={cn('gap-1.5', className)}>
      <FieldLabel
        htmlFor={id}
        className={label ? undefined : 'sr-only'}
      >
        {accessibleLabel}
      </FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id={id}
              type="button"
              aria-label={accessibleLabel}
              className="justify-start px-2.5 font-normal"
            />
          }
        >
          <CalendarBlank data-icon="inline-start" />
          {selected ? (
            selected.toLocaleDateString('en-PH', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          ) : (
            <span>Pick a date</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) onChange(dateToIsoString(date))
            }}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
