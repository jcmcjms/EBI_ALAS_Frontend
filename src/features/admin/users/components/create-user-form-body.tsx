import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/forms/select'
import { useActiveBranches, toBranchSelectItems } from '@/src/shared/lib/api/branches'
import { stripRoleDisplayName } from '@/src/features/admin/users/components/role-badges'

interface FormState {
  username: string
  firstName: string
  middleName: string
  lastName: string
  branchId: string
  role: string
}

export interface CreateUserFormBodyProps {
  form: FormState
  onFieldChange: <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => void
  roleSelectItems: { value: string; label: string }[]
  roles: { name: string; displayName: string }[]
}

export function CreateUserFormBody({
  form,
  onFieldChange,
  roleSelectItems,
  roles,
}: CreateUserFormBodyProps) {
  const { data: branches } = useActiveBranches()
  const branchItems = toBranchSelectItems(branches)

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-6">
      <div className="space-y-2">
        <Label htmlFor="create-username">Username *</Label>
        <Input
          id="create-username"
          value={form.username}
          onChange={(e) => onFieldChange('username', e.target.value)}
          placeholder="jdelacruz"
          autoComplete="off"
          className="h-9"
        />
        <p className="text-xs text-muted-foreground">
          Letters, numbers and underscores only.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="create-firstName">First Name *</Label>
          <Input
            id="create-firstName"
            value={form.firstName}
            onChange={(e) => onFieldChange('firstName', e.target.value)}
            placeholder="Juan"
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-middleName">Middle Name</Label>
          <Input
            id="create-middleName"
            value={form.middleName}
            onChange={(e) => onFieldChange('middleName', e.target.value)}
            placeholder="Optional"
            className="h-9"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-lastName">Last Name *</Label>
        <Input
          id="create-lastName"
          value={form.lastName}
          onChange={(e) => onFieldChange('lastName', e.target.value)}
          placeholder="Dela Cruz"
          className="h-9"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-branch">Assigned Branch *</Label>
        <Select
          value={form.branchId}
          onValueChange={(value) => onFieldChange('branchId', value ?? '')}
          items={branchItems}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {(branches ?? []).map((b) => (
              <SelectItem key={b.code} value={b.code}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-role">Primary Role *</Label>
        <Select
          value={form.role}
          onValueChange={(value) => onFieldChange('role', value ?? '')}
          items={roleSelectItems}
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
          A temporary password will be generated for this account.
        </p>
      </div>
    </div>
  )
}
