import {
  BellSimple,
  CaretDown,
  ChatCircle,
  ClipboardText,
  GearSix,
  WarningCircle,
  type Icon,
} from '@phosphor-icons/react'

import { Avatar, AvatarFallback } from '@/src/shared/ui/avatar'
import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/src/shared/ui/dropdown-menu'
import { cn } from '@/src/shared/lib/utils'
import {
  formatRelativeTime,
  initialsOf,
  type NotificationType,
  type AppNotification,
} from '../types'

export const TYPE_META: Record<
  NotificationType,
  { label: string; icon: Icon; iconWrap: string; dot: string }
> = {
  application: {
    label: 'Application',
    icon: ClipboardText,
    iconWrap: 'bg-blue-100 text-blue-600',
    dot: 'bg-blue-500',
  },
  action: {
    label: 'Action Required',
    icon: WarningCircle,
    iconWrap: 'bg-amber-100 text-amber-600',
    dot: 'bg-amber-500',
  },
  message: {
    label: 'Message',
    icon: ChatCircle,
    iconWrap: 'bg-green-100 text-green-600',
    dot: 'bg-green-500',
  },
  system: {
    label: 'System',
    icon: GearSix,
    iconWrap: 'bg-violet-100 text-violet-600',
    dot: 'bg-violet-500',
  },
}

export type StatusFilter = 'all' | 'unread' | 'read'
export type TypeFilter = 'all' | NotificationType

interface FilterMenuProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

export function FilterMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: FilterMenuProps<T>) {
  const active = options.find((o) => o.value === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="gap-2" />}
      >
        {value !== 'all' && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
        )}
        {active?.label ?? label}
        <CaretDown size={14} weight="bold" className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-36">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => v && onChange(v as T)}
        >
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface NotificationItemProps {
  notification: AppNotification
  density: 'comfortable' | 'compact'
  onClick: () => void
}

export function NotificationItem({
  notification: n,
  density,
  onClick,
}: NotificationItemProps) {
  const meta = TYPE_META[n.type]
  const TypeIcon = meta.icon

  return (
    <li
      onClick={onClick}
      className={cn(
        'flex cursor-pointer gap-4 px-5 transition-colors hover:bg-muted/40',
        density === 'comfortable' ? 'py-4' : 'py-2.5',
        !n.read && 'bg-primary/[0.04]',
      )}
    >
      {n.actor ? (
        <Avatar className="mt-0.5">
          <AvatarFallback>{initialsOf(n.actor)}</AvatarFallback>
        </Avatar>
      ) : (
        <div
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            meta.iconWrap,
          )}
        >
          <TypeIcon size={16} weight="bold" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className={cn(
              'truncate text-left text-sm hover:underline',
              n.read
                ? 'font-medium text-foreground/80'
                : 'font-semibold',
            )}
          >
            {n.title}
          </button>
          {!n.read && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-primary"
              aria-label="Unread"
            />
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {n.description}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 self-center sm:gap-4">
        <Badge
          variant="outline"
          className="hidden gap-1.5 font-normal sm:flex"
        >
          <span
            className={cn('h-1.5 w-1.5 rounded-full', meta.dot)}
            aria-hidden
          />
          {meta.label}
        </Badge>
        <time
          dateTime={n.createdAt}
          title={new Date(n.createdAt).toLocaleString('en-PH')}
          className="w-24 text-right text-xs text-muted-foreground"
        >
          {formatRelativeTime(n.createdAt)}
        </time>
      </div>
    </li>
  )
}

interface NotificationListProps {
  items: AppNotification[]
  isLoading: boolean
  totalCount: number
  hasActiveFilters: boolean
  density: 'comfortable' | 'compact'
  onOpen: (id: string, link?: string) => void
  onClearFilters: () => void
}

export function NotificationList({
  items,
  isLoading,
  totalCount,
  hasActiveFilters,
  density,
  onOpen,
  onClearFilters,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">
          Loading notifications...
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <BellSimple size={22} className="text-muted-foreground" />
        </div>
        <div>
          {totalCount === 0 && !hasActiveFilters ? (
            <>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Notifications about loan applications and approvals will appear
                here.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                No notifications match your filters
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Try adjusting the search or filters.
              </p>
            </>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {items.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          density={density}
          onClick={() => onOpen(n.id, n.link)}
        />
      ))}
    </ul>
  )
}