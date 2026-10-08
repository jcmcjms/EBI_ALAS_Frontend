import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/forms/select'
import { Label } from '@/src/shared/ui/primitives/label'
import { BranchMultiSelect } from '@/src/shared/ui/data-display/branch-multi-select'
import { BRANCHES } from '@/src/shared/lib/api/types'
import { stripRoleDisplayName } from '@/src/features/admin/users/components/role-badges'
import type { EditableProfile } from './user-edit-drawer.types'
import type { ApprovalAuthorityDto } from '../api/approval-matrix'

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export interface RolesTabProps {
  profile: EditableProfile
  isApprover: boolean
  isBranchScope: boolean
  canEdit: boolean
  authorities: ApprovalAuthorityDto[] | undefined
  authoritiesLoading: boolean
  onFieldChange: <K extends keyof EditableProfile>(
    field: K,
    value: EditableProfile[K],
  ) => void
  roleSelectItems: { value: string; label: string }[]
  roles: { name: string; displayName: string }[]
}

export function RolesTab({
  profile,
  isApprover,
  isBranchScope,
  canEdit,
  authorities,
  authoritiesLoading,
  onFieldChange,
  roleSelectItems,
  roles,
}: RolesTabProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="edit-role">Primary Role</Label>
        <Select
          value={profile.role}
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
          Role determines the baseline permissions. The full mapping is visible
          in the Role Matrix.
        </p>
      </div>

      {isApprover && (
        <div className="space-y-2">
          <Label htmlFor="edit-authority">Approval Authority</Label>
          <Select
            value={profile.jobTitle}
            onValueChange={(value) => onFieldChange('jobTitle', value ?? '')}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue
                placeholder={
                  authoritiesLoading ? 'Loading...' : 'Select authority'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(authorities ?? []).map((auth) => (
                <SelectItem key={auth.key} value={auth.key}>
                  {auth.displayName} — Tier {auth.tier}, up to{' '}
                  {formatPhp(auth.maxTotalExposure)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Determines which loans this approver can authorize based on exposure
            and tier.
          </p>
        </div>
      )}

      {isBranchScope && (
        <div className="space-y-2">
          <Label>Covered Branches *</Label>
          <BranchMultiSelect
            branches={BRANCHES}
            selected={profile.coveredBranches}
            onChange={(codes) => onFieldChange('coveredBranches', codes)}
            placeholder="Select branches this approver covers"
            disabled={!canEdit}
          />
          <p className="text-xs text-muted-foreground">
            This approver can authorize loans from the selected branches.
          </p>
        </div>
      )}
    </>
  )
}