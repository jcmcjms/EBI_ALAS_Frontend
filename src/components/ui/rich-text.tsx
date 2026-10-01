import { useMemo, type ReactNode } from 'react'

import { cn } from '@/src/shared/lib/utils'
import { isRichTextEmpty, toRichText } from '@/src/shared/lib/rich-text'

interface RichTextProps {
  value?: string | null
  className?: string
  emptyFallback?: ReactNode
}

export function RichText({
  value,
  className,
  emptyFallback = '-',
}: RichTextProps) {
  const html = useMemo(() => toRichText(value ?? ''), [value])

  if (isRichTextEmpty(html)) return <>{emptyFallback}</>

  return (
    <div
      className={cn('rich-text', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
