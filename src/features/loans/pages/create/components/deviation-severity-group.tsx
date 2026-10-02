import { Circle } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/badge'
import type { DeviationCatalogItemDto } from '@/src/features/admin/users/hooks/use-deviation-catalog'

interface DeviationSeverityGroupProps {
  title: string
  severity: 'major' | 'minor'
  items: DeviationCatalogItemDto[]
  description: string
  renderItem: (reason: string) => React.ReactNode
}

export function DeviationSeverityGroup({
  title,
  severity,
  items,
  description,
  renderItem,
}: DeviationSeverityGroupProps) {
  const borderColor =
    severity === 'major' ? 'border-red-500/30' : 'border-amber-500/30'
  const bgColor = severity === 'major' ? 'bg-red-500/5' : 'bg-amber-500/5'
  const headerBg = severity === 'major' ? 'bg-red-500/10' : 'bg-amber-500/10'
  const textColor = severity === 'major' ? 'text-red-700' : 'text-amber-700'
  const badgeVariant = severity === 'major' ? 'destructive' : 'secondary'
  const dotColor = severity === 'major' ? 'text-red-500' : 'text-amber-500'

  return (
    <div
      className={`rounded-md border ${borderColor} ${bgColor} overflow-hidden`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2.5 ${headerBg} border-b ${borderColor}`}
      >
        <div className="flex items-center gap-2">
          <Circle size={8} weight="fill" className={dotColor} />
          <span className={`text-sm font-semibold ${textColor}`}>
            {title}
          </span>
          <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
            {severity === 'major' ? 'Major' : 'Minor'}
          </Badge>
        </div>
        <span className={`text-xs ${textColor} opacity-80`}>
          {description}
        </span>
      </div>
      <div className="p-4 space-y-3">
        {items.map((item) => renderItem(item.description))}
      </div>
    </div>
  )
}