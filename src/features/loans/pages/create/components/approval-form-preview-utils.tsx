import React from 'react'
import { cn } from '@/src/shared/lib/utils'
import type { ClientFormData } from '@/src/features/loans/schemas/schema'
import type { SignatureSlotDto } from '@/src/features/loans/api/signatures'

export function num(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function dash(value?: string | null): string {
  return value && value.trim().length > 0 ? value : '-'
}

export function isoDate(iso?: string): string {
  return iso ? iso.slice(0, 10) : '-'
}

export function fullNameOf(client: Partial<ClientFormData>): string {
  const parts = [client.lastName, client.firstName, client.middleName].filter(
    Boolean,
  )
  if (parts.length === 0) return '-'
  const [last, first, middle] = parts as string[]
  return middle
    ? `${last.toUpperCase()}, ${first.toUpperCase()} ${middle[0].toUpperCase()}.`
    : `${last.toUpperCase()}, ${first.toUpperCase()}`
}

export function ageFrom(isoDateStr?: string): string {
  if (!isoDateStr) return '-'
  const birth = new Date(isoDateStr)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return String(age)
}

export const BLUE = 'bg-[#d9eaf7]'
export const B = 'border border-black'
export const DOUBLE_UNDERLINE: React.CSSProperties = {
  borderBottom: '3px double #000',
}
export const TOP_LINE: React.CSSProperties = { borderTop: '1px solid #000' }
export const BAND_MAIN = 'grid grid-cols-[58%_42%]'

interface TableCellProps {
  children: React.ReactNode
  className?: string
  colSpan?: number
  rowSpan?: number
  blue?: boolean
}

export function L({ children, className, colSpan, rowSpan }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(B, 'px-1.5 py-0.5 font-bold', className)}
    >
      {children}
    </td>
  )
}

export function V({
  children,
  blue,
  className,
  colSpan,
  rowSpan,
}: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(B, 'px-1.5 py-0.5', blue && BLUE, className)}
    >
      {children}
    </td>
  )
}

export function AmtRow({
  label,
  value,
  blue,
  bold,
  underline,
  topLine,
  labelBold,
}: {
  label: React.ReactNode
  value: React.ReactNode
  blue?: boolean
  bold?: boolean
  underline?: boolean
  topLine?: boolean
  labelBold?: boolean
}) {
  return (
    <div className="flex items-end justify-between gap-2 py-[1px]">
      <span className={cn(labelBold && 'font-bold')}>{label}</span>
      <span
        className={cn(
          'min-w-24 text-right tabular-nums',
          bold && 'font-bold',
          blue && `${BLUE} px-1`,
          underline && 'border-b border-black',
        )}
        style={topLine ? TOP_LINE : undefined}
      >
        {value}
      </span>
    </div>
  )
}

export function SignatureBlock({ slot }: { slot: SignatureSlotDto }) {
  const name = slot.signedByName?.trim()
  const title = slot.signedByJobTitle?.trim() || slot.jobTitle || '\u2014'
  return (
    <div>
      <div className="font-bold">{slot.action}:</div>
      <div className="mt-8 border-b border-black" />
      <div className="mt-0.5 font-bold">{name ?? '\u00A0'}</div>
      <div>
        {title} <span className="font-bold">({slot.role})</span>
      </div>
      <div className="mt-1">
        Date signed:{' '}
        <span className="tabular-nums">
          {slot.signedAt ? isoDate(slot.signedAt) : '____________'}
        </span>
      </div>
    </div>
  )
}