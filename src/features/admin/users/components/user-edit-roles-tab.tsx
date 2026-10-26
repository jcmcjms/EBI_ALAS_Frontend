import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/forms/select'
import { Label } from '@/src/shared/ui/primitives/label'
import { stripRoleDisplayName } from '@/src/features/admin/users/components/role-badges'
import type { EditableProfile } from './user-edit-drawer.types'

export interface RolesTabProps {
  profile: EditableProfile
  canEdit: boolean
  onFieldChange: <K extends keyof EditableProfile>(
    field: K,
    value: EditableProfile[K],
  ) => void
  roleSelectItems: { value: string; label: string }[]
  roles: { name: string; displayName: string }[]
}

export function RolesTab({
  profile,
  canEdit,
  onFieldChange,
  roleSelectItems,
  roles,
}: RolesTabProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="edit-role">Primary role</Label>
      <Select
        value={profile.role}
        onValueChange={(value) => onFieldChange('role', value ?? '')}
        items={roleSelectItems}
        disabled={!canEdit}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((r) => (
            <SelectItem key={r.name} value={r.name}>
              {stripRoleDisplayName(r.displayName)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        The role decides what this user can do in ALAS.
      </p>
    </div>
  )
}
