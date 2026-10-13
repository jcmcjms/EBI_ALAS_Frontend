import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/forms/select'
import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import { useActiveBranches, toBranchSelectItems } from '@/src/shared/lib/api/branches'
import type { UserResponse } from '../api/users-types'
import type { EditableProfile } from './user-edit-drawer.types'

export interface ProfileTabProps {
  profile: EditableProfile
  user: UserResponse | null
  canEdit: boolean
  onFieldChange: <K extends keyof EditableProfile>(
    field: K,
    value: EditableProfile[K],
  ) => void
}

export function ProfileTab({
  profile,
  user,
  canEdit,
  onFieldChange,
}: ProfileTabProps) {
  const { data: branches } = useActiveBranches()
  const branchItems = toBranchSelectItems(branches)

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-firstName">First Name *</Label>
          <Input
            id="edit-firstName"
            value={profile.firstName}
            onChange={(e) => onFieldChange('firstName', e.target.value)}
            className="h-9"
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-middleName">Middle Name</Label>
          <Input
            id="edit-middleName"
            value={profile.middleName}
            onChange={(e) => onFieldChange('middleName', e.target.value)}
            className="h-9"
            disabled={!canEdit}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-lastName">Last Name *</Label>
        <Input
          id="edit-lastName"
          value={profile.lastName}
          onChange={(e) => onFieldChange('lastName', e.target.value)}
          className="h-9"
          disabled={!canEdit}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-username">Username</Label>
          <Input
            id="edit-username"
            value={user?.username ?? ''}
            className="h-9"
            disabled
          />
          <p className="text-xs text-muted-foreground">
            Usernames cannot be changed.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-created">Created</Label>
          <Input
            id="edit-created"
            value={
              user && !Number.isNaN(new Date(user.createdAt).getTime())
                ? new Date(user.createdAt).toLocaleDateString()
                : ''
            }
            className="h-9"
            disabled
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-branch">Assigned Branch</Label>
        <Select
          value={profile.branchId}
          onValueChange={(value) => onFieldChange('branchId', value ?? '')}
          items={branchItems}
          disabled={!canEdit}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {branchItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-jobTitle">Job Title</Label>
        <Input
          id="edit-jobTitle"
          value={profile.jobTitle}
          onChange={(e) => onFieldChange('jobTitle', e.target.value)}
          maxLength={100}
          className="h-9"
          disabled={!canEdit}
        />
      </div>
    </>
  )
}
