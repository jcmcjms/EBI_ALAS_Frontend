import { MagnifyingGlass, Plus, Funnel } from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import { Input } from '@/src/shared/ui/primitives/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/forms/select'
import type { BranchStatus } from '@/src/shared/lib/api/types'

export type StatusFilter = 'all' | BranchStatus

export interface BranchesToolbarProps {
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
  canManage: boolean
  onCreate: () => void
}

export function BranchesToolbar({
  globalFilter,
  onGlobalFilterChange,
  statusFilter,
  onStatusFilterChange,
  canManage,
  onCreate,
}: BranchesToolbarProps) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <div className="relative">
        <MagnifyingGlass
          size={16}
          weight="bold"
          className="absolute top-2.5 left-2.5 text-muted-foreground"
        />
        <Input
          placeholder="Search code or name…"
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="h-9 w-full bg-background pl-8 sm:w-[220px]"
        />
      </div>

      <div className="flex gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
        >
          <SelectTrigger className="h-9 w-[150px] bg-background">
            <Funnel size={14} className="mr-1 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
            <SelectItem value="Merged">Merged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 sm:ml-auto">
        {canManage && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={onCreate}>
            <Plus size={14} weight="bold" data-icon="inline-start" />
            New branch
          </Button>
        )}
      </div>
    </div>
  )
}
