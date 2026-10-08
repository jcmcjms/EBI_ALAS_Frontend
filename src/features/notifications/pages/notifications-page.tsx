import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Check,
  GearSix,
  ListDashes,
  MagnifyingGlass,
  Rows,
} from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { Card } from '@/src/shared/ui/data-display/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/shared/ui/navigation/dropdown-menu'
import { Input } from '@/src/shared/ui/primitives/input'
import { type NotificationType } from '../types'
import {
  useNotificationInbox,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/use-notifications'
import { useDebouncedValue } from '@/src/shared/hooks/use-debounced'
import {
  FilterMenu,
  NotificationList,
  type StatusFilter,
  type TypeFilter,
} from './notification-list'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

export function NotificationsPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    'comfortable',
  )
  const [page, setPage] = useState(1)
  const [autoRead, setAutoRead] = useState(false)

  const { data, isLoading } = useNotificationInbox({
    page,
    pageSize: PAGE_SIZE,
    status,
    type: type === 'all' ? undefined : type,
    search: debouncedSearch.trim() || undefined,
  })

  const items = useMemo(() => {
    if (!data?.items) return []
    return data.items.map((n) => ({
      id: String(n.id),
      type: (n.type as NotificationType) ?? 'system',
      title: n.title,
      description: n.description,
      createdAt: n.createdAt,
      read: n.isRead,
      actor: undefined,
      link: n.link ?? undefined,
    }))
  }, [data?.items])

  const totalCount = data?.totalCount ?? 0
  const unreadCount = data?.unreadCount ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const markReadMutation = useMarkNotificationRead()
  const markAllMutation = useMarkAllNotificationsRead()

  const openNotification = (id: string, link?: string) => {
    if (autoRead) {
      markReadMutation.mutate(id)
    }
    if (link) navigate({ href: link })
  }

  const setQueryAndReset = (next: string) => {
    setSearch(next)
    setPage(1)
  }
  const setStatusAndReset = (next: StatusFilter) => {
    setStatus(next)
    setPage(1)
  }
  const setTypeAndReset = (next: TypeFilter) => {
    setType(next)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setType('all')
    setPage(1)
  }

  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(totalCount, page * PAGE_SIZE)

  const hasActiveFilters =
    status !== 'all' || type !== 'all' || debouncedSearch.trim().length > 0

  return (
    <div className="flex flex-1 flex-col bg-muted/40">
      <div className="container mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <Badge className="tabular-nums">{unreadCount} unread</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Stay up to date with loan applications, approvals and system
              updates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => markAllMutation.mutate()}
              disabled={unreadCount === 0 || markAllMutation.isPending}
              className="gap-2"
            >
              <Check size={16} weight="bold" />
              Mark All as Read
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Notification preferences"
                  />
                }
              >
                <GearSix size={16} weight="bold" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Preferences</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={autoRead}
                    onCheckedChange={(c) => setAutoRead(!!c)}
                  >
                    Mark read when opened
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-64">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setQueryAndReset(e.target.value)}
              placeholder="Search notifications..."
              aria-label="Search notifications"
              className="pl-9"
            />
          </div>
          <FilterMenu<StatusFilter>
            label="Status"
            value={status}
            onChange={setStatusAndReset}
            options={[
              { value: 'all', label: 'Status' },
              { value: 'unread', label: 'Unread' },
              { value: 'read', label: 'Read' },
            ]}
          />
          <FilterMenu<TypeFilter>
            label="Type"
            value={type}
            onChange={setTypeAndReset}
            options={[
              { value: 'all', label: 'Type' },
              { value: 'application', label: 'Application' },
              { value: 'action', label: 'Action Required' },
              { value: 'message', label: 'Message' },
              { value: 'system', label: 'System' },
            ]}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setDensity((d) =>
                d === 'comfortable' ? 'compact' : 'comfortable',
              )
            }
            aria-pressed={density === 'compact'}
            aria-label="Toggle compact density"
            title={
              density === 'compact' ? 'Comfortable density' : 'Compact density'
            }
          >
            {density === 'compact' ? (
              <Rows size={16} weight="bold" />
            ) : (
              <ListDashes size={16} weight="bold" />
            )}
          </Button>
        </div>

        {}
        <Card className="mt-6 overflow-hidden">
          <NotificationList
            items={items}
            isLoading={isLoading}
            totalCount={totalCount}
            hasActiveFilters={hasActiveFilters}
            density={density}
            onOpen={openNotification}
            onClearFilters={clearFilters}
          />
        </Card>

        {}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {from} to {to} of {totalCount} notification
            {totalCount === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}