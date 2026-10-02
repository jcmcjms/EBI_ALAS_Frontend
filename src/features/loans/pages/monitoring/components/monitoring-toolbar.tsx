import { useEffect, useState } from 'react'
import { Button } from '@/src/shared/ui/button'
import { Input } from '@/src/shared/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/shared/ui/popover.tsx'
import { Calendar } from '@/src/shared/ui/calendar.tsx'
import { Badge } from '@/src/shared/ui/badge'
import { Checkbox } from '@/src/shared/ui/checkbox'
import {
  MagnifyingGlass,
  CalendarBlank,
  Funnel,
  X,
  UserCircle,
  CaretDown,
} from '@phosphor-icons/react'
import { format } from 'date-fns'
import type { MonitoringFilters } from '@/src/features/loans/types/monitoring'
import type { LoanStatus } from '@/src/features/loans/utils/loan-status'
import {
  LOAN_STATUS_META,
  STATUS_FILTER_ORDER,
} from '@/src/features/loans/utils/loan-status'
import { sameStatusSet } from '@/src/features/loans/constants/role-queues'
import { cn } from '@/src/shared/lib/utils'

interface ToolbarProps {
  filters: MonitoringFilters
  onFiltersChange: (filters: MonitoringFilters) => void
  roleQueue: LoanStatus[]
}

export function MonitoringToolbar({
  filters,
  onFiltersChange,
  roleQueue,
}: ToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)

  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: localSearch })
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch])

  const isRoleQueue =
    roleQueue.length > 0 && sameStatusSet(filters.status, roleQueue)

  return (
    <div className="flex flex-wrap items-center gap-3 gap-y-2 px-4 py-3 border-b bg-muted/20">
      {}
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-2.5 text-muted-foreground"
          weight="bold"
        />
        <Input
          placeholder="Search applications..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 h-9 bg-background"
        />
      </div>

      {}
      <Popover>
        <PopoverTrigger className="inline-flex items-center gap-2 h-9 w-[240px] justify-start text-left font-normal bg-background border border-input rounded-md px-3 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">
          <CalendarBlank
            size={16}
            className="text-muted-foreground"
            weight="bold"
          />
          {filters.dateRange.from ? (
            filters.dateRange.to ? (
              <>
                {format(filters.dateRange.from, 'LLL dd, y')} -{' '}
                {format(filters.dateRange.to, 'LLL dd, y')}
              </>
            ) : (
              format(filters.dateRange.from, 'LLL dd, y')
            )
          ) : (
            <span className="text-muted-foreground">Date range</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={filters.dateRange.from}
            selected={{
              from: filters.dateRange.from,
              to: filters.dateRange.to,
            }}
            onSelect={(range) =>
              onFiltersChange({
                ...filters,
                dateRange: { from: range?.from, to: range?.to },
              })
            }
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {}
      <Popover>
        <PopoverTrigger className="inline-flex h-9 min-w-[180px] cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground">
          <span className="flex items-center gap-2 truncate">
            <Funnel size={14} className="text-muted-foreground" />
            {filters.status.length === 0 ? (
              <span className="text-muted-foreground">All Statuses</span>
            ) : filters.status.length === 1 ? (
              LOAN_STATUS_META[filters.status[0] as LoanStatus].label
            ) : (
              `${filters.status.length} statuses`
            )}
          </span>
          <CaretDown size={12} className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[260px] p-2">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60"
            onClick={() => onFiltersChange({ ...filters, status: [] })}
          >
            <span className="text-muted-foreground">All Statuses</span>
          </button>
          <div className="my-1 h-px bg-border" />
          <div className="max-h-72 overflow-y-auto">
            {STATUS_FILTER_ORDER.map((s) => (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60"
              >
                <Checkbox
                  checked={filters.status.includes(s)}
                  onCheckedChange={(v) =>
                    onFiltersChange({
                      ...filters,
                      status:
                        v === true
                          ? [...filters.status, s]
                          : filters.status.filter((x: LoanStatus) => x !== s),
                    })
                  }
                />
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full border',
                    LOAN_STATUS_META[s].className,
                  )}
                />
                <span className="flex-1">{LOAN_STATUS_META[s].label}</span>
                {roleQueue.includes(s) && (
                  <span className="text-[10px] text-muted-foreground">
                    your queue
                  </span>
                )}
              </label>
            ))}
          </div>
          {filters.status.length > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-1.5 text-xs text-muted-foreground"
                onClick={() => onFiltersChange({ ...filters, status: [] })}
              >
                <X size={12} weight="bold" /> Clear status filter
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      {}
      {roleQueue.length > 0 &&
        (isRoleQueue ? (
          <Badge
            variant="secondary"
            className="h-9 gap-1.5 px-3 text-xs font-normal"
          >
            <Funnel size={12} weight="bold" />
            My queue
            <button
              type="button"
              aria-label="Clear my-queue filter and show all statuses"
              className="ml-0.5 rounded-sm hover:text-destructive focus-visible:ring-1 focus-visible:ring-ring"
              onClick={() => onFiltersChange({ ...filters, status: [] })}
            >
              <X size={12} weight="bold" />
            </button>
          </Badge>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-xs text-muted-foreground"
            onClick={() => onFiltersChange({ ...filters, status: roleQueue })}
            title={`Show only ${roleQueue.map((s) => LOAN_STATUS_META[s].label).join(', ')}`}
          >
            <Funnel size={12} weight="bold" /> My queue
          </Button>
        ))}

      {}
      {filters.myTurn ? (
        <Badge
          variant="secondary"
          className="h-9 gap-1.5 px-3 text-xs font-normal"
        >
          <UserCircle size={12} weight="bold" />
          My turn
          <button
            type="button"
            aria-label="Show all queued applications"
            className="ml-0.5 rounded-sm hover:text-destructive focus-visible:ring-1 focus-visible:ring-ring"
            onClick={() => onFiltersChange({ ...filters, myTurn: false })}
          >
            <X size={12} weight="bold" />
          </button>
        </Badge>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-xs text-muted-foreground"
          onClick={() => onFiltersChange({ ...filters, myTurn: true })}
          title="Show only the application currently assigned to you"
        >
          <UserCircle size={12} weight="bold" /> My turn
        </Button>
      )}
    </div>
  )
}
