import React from 'react'
import { cn } from '@/src/shared/lib/utils'
import type { ClientFormData } from '@/src/features/loans/schemas/schema'
import type { SignatureSlotDto } from '@/src/features/loans/api/signatures'
import type {
  LoanDeviationDto,
  DocumentRemarkDto,
} from '@/src/features/loans/api/loan-review'

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

export interface ApprovalFormActionEntry {
  id: number
  action: string
  fromStatus: string | null
  toStatus: string | null
  comments: string | null
  actionDate: string
  actionByUserName: string
}

function formatActionTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatTransition(from: string | null, to: string | null): string {
  const f = from?.trim() || '\u2014'
  const t = to?.trim() || '\u2014'
  return `${f} \u2192 ${t}`
}

export interface UnifiedAuditEntry {
  id: string
  type: 'action' | 'deviation-remark' | 'document-remark'
  label: string
  context: string | null
  actor: string
  timestamp: string
  content: string
}

export function buildUnifiedAuditTrail(
  actions: ApprovalFormActionEntry[] | undefined,
  deviations: LoanDeviationDto[] | undefined,
  documentRemarks: DocumentRemarkDto[] | undefined,
): UnifiedAuditEntry[] {
  const entries: UnifiedAuditEntry[] = []

  if (actions) {
    for (const a of actions) {
      entries.push({
        id: `action-${a.id}`,
        type: 'action',
        label: a.action,
        context: formatTransition(a.fromStatus, a.toStatus),
        actor: a.actionByUserName,
        timestamp: a.actionDate,
        content: a.comments?.trim() ?? '',
      })
    }
  }

  if (deviations) {
    for (const dev of deviations) {
      for (const remark of dev.remarks) {
        entries.push({
          id: `dev-remark-${remark.id}`,
          type: 'deviation-remark',
          label: 'Deviation Remark',
          context: dev.reasonText,
          actor: remark.authorName,
          timestamp: remark.createdAt,
          content: remark.body,
        })
      }
    }
  }

  if (documentRemarks) {
    for (const remark of documentRemarks) {
      entries.push({
        id: `doc-remark-${remark.id}`,
        type: 'document-remark',
        label: 'Document Remark',
        context: remark.checklistIdCode,
        actor: remark.authorName,
        timestamp: remark.createdAt,
        content: remark.body,
      })
    }
  }

  return entries.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime()
    const tb = new Date(b.timestamp).getTime()
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
    if (Number.isNaN(ta)) return 1
    if (Number.isNaN(tb)) return -1
    return ta - tb
  })
}

export const BLUE = 'bg-[#d9eaf7]'
export const B = 'border border-black'
export const DOUBLE_UNDERLINE: React.CSSProperties = {
  borderBottom: '3px double #000',
}
export const TOP_DOUBLE: React.CSSProperties = {
  borderTop: '1px solid #000',
  borderBottom: '3px double #000',
}

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

export function RailCell({ children }: { children?: React.ReactNode }) {
  return (
    <td className="border-l border-black px-1.5 py-0.5 text-center tabular-nums">
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
        style={topLine ? { borderTop: '1px solid #000' } : undefined}
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

export { formatActionTime }