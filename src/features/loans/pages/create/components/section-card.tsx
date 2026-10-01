import type { ReactNode } from 'react'
import { CloudCheck } from '@phosphor-icons/react'

import { Badge } from '@/src/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card'
import { cn } from '@/src/shared/lib/utils'

interface SectionCardProps {
  step: number
  title: string
  description?: string
  icon?: ReactNode

  systemSourced?: boolean

  badge?: ReactNode
  contentClassName?: string
  children: ReactNode
}

export function SectionCard({
  step,
  title,
  description,
  icon,
  systemSourced,
  badge,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <Card className="scroll-mt-24">
      <CardHeader className="border-b bg-muted/30 pb-3">
        <CardTitle
          tabIndex={-1}
          data-section-heading
          className="flex flex-wrap items-center gap-2 rounded-md text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {icon}
          <span className="flex items-center gap-2">
            <span className="tabular-nums text-muted-foreground">{step}.</span>
            <span>{title}</span>
          </span>
          {systemSourced && (
            <Badge variant="outline" className="gap-1 text-xs font-normal">
              <CloudCheck size={12} weight="bold" />
              Auto-filled
            </Badge>
          )}
          {badge}
        </CardTitle>
        {description && (
          <CardDescription className="pt-1 text-xs">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn('space-y-6 pt-6', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

export function SubSectionHeading({
  step,
  title,
  icon,
  actions,
}: {
  step: string
  title: string
  icon?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        <span className="tabular-nums text-muted-foreground">{step}</span>
        <span>{title}</span>
      </h3>
      {actions}
    </div>
  )
}

export function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string
  value?: string
  hint?: string
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">
        {value?.trim() ? (
          value
        ) : (
          <span className="font-normal text-muted-foreground">—</span>
        )}
      </dd>
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  )
}
