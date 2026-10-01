import type { ReactNode } from 'react'
import { cn } from '@/src/shared/lib/utils'

export const APPROVAL_FORM_SHEET_WIDTH_PX = 800

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
