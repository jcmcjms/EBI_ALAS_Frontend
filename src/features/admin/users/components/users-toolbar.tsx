import {
  MagnifyingGlass,
  Plus,
  Export,
  FileArrowUp,
  Funnel,
} from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/button'
import { Input } from '@/src/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/select'
import { BRANCHES } from '@/src/shared/lib/api/types'
import { stripRoleDisplayName } from '@/src/features/admin/users/components/role-badges'
import type { RoleInfo } from '@/src/shared/lib/api/types'

export interface UsersToolbarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  branchFilter: string
  onBranchFilterChange: (value: string | null) => void
  roleFilter: string
  onRoleFilterChange: (value: string | null) => void
  roles: RoleInfo[]
  canCreateUsers: boolean
  onImport: () => void
  onExport: () => void
  onCreateUser: () => void
}

export function UsersToolbar({
  searchInput,
  onSearchInputChange,
  branchFilter,
  onBranchFilterChange,
  roleFilter,
  onRoleFilterChange,
  roles,
  canCreateUsers,
  onImport,
  onExport,
  onCreateUser,
}: UsersToolbarProps) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {}
      <div className="relative">
        <MagnifyingGlass
          size={16}
          weight="bold"
          className="absolute top-2.5 left-2.5 text-muted-foreground"
        />
        <Input
          placeholder="Search name, username..."
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          className="h-9 w-full bg-background pl-8 sm:w-[220px]"
        />
      </div>

      {}
      <div className="flex gap-2">
        <Select value={branchFilter} onValueChange={onBranchFilterChange}>
          <SelectTrigger className="h-9 w-[150px] bg-background">
            <Funnel size={14} className="mr-1 text-muted-foreground" />
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {BRANCHES.map((b) => (
              <SelectItem key={b.code} value={b.code}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="h-9 w-[150px] bg-background">
            <Funnel size={14} className="mr-1 text-muted-foreground" />
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.name} value={r.name}>
                {stripRoleDisplayName(r.displayName)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {}
      <div className="flex gap-2 sm:ml-auto">
        {canCreateUsers && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onImport}
          >
            <FileArrowUp size={14} weight="bold" />
            Import
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onExport}
        >
          <Export size={14} weight="bold" data-icon="inline-start" />
          Export Excel
        </Button>
        {canCreateUsers && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={onCreateUser}>
            <Plus size={14} weight="bold" data-icon="inline-start" />
            Add User
          </Button>
        )}
      </div>
    </div>
  )
}
