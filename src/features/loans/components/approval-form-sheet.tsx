import type { ReactNode } from 'react'
import { cn } from '@/src/shared/lib/utils'

export const APPROVAL_FORM_SHEET_WIDTH_PX = 800

export function PrintPaperHeader({
  title,
  meta,
  className,
}: {
  title: string
  meta?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-2', className)}>
      <div className="hidden print:flex print:items-end print:justify-between print:gap-3">
        <img
          src="/print_logo.png"
          alt="Enterprise Bank"
          className="h-5 w-auto"
          width={2000}
          height={255}
        />
        {meta ? (
          <div className="pb-0.5 text-right tabular-nums">{meta}</div>
        ) : null}
      </div>
      <h1 className="text-sm font-bold underline print:mt-1">{title}</h1>
    </header>
  )
}

export function ApprovalFormSheet({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'mx-auto w-[800px] max-w-full',
        'text-[9px] leading-[1.35] [font-family:Arial,Helvetica,sans-serif]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ApprovalFormViewport({
  children,
  zoom = 1,
}: {
  children: ReactNode
  zoom?: number
}) {
  return (
    <div className="overflow-x-auto bg-white">
      <div className="mx-auto w-max min-w-full" style={{ zoom }}>
        {children}
      </div>
    </div>
  )
}
