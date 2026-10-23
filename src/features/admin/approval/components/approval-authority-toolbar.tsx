import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import { Input } from '@/src/shared/ui/primitives/input'

export interface ApprovalAuthorityToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  canManage: boolean
  onCreate: () => void
}

export function ApprovalAuthorityToolbar({
  search,
  onSearchChange,
  canManage,
  onCreate,
}: ApprovalAuthorityToolbarProps) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <div className="relative">
        <MagnifyingGlass
          size={16}
          weight="bold"
          className="absolute top-2.5 left-2.5 text-muted-foreground"
        />
        <Input
          placeholder="Search authority…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full bg-background pl-8 sm:w-[220px]"
        />
      </div>

      <div className="flex gap-2 sm:ml-auto">
        {canManage && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={onCreate}>
            <Plus size={14} weight="bold" data-icon="inline-start" />
            New authority
          </Button>
        )}
      </div>
    </div>
  )
}
