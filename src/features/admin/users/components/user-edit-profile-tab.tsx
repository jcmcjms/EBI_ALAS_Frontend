import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/select'
import { Input } from '@/src/shared/ui/input'
import { Label } from '@/src/shared/ui/label'
import { BranchMultiSelect } from '@/src/shared/ui/branch-multi-select'
import { BRANCHES, type UserResponse } from '@/src/shared/lib/api/types'
import type { EditableProfile } from './user-edit-drawer.types'
import type { ApprovalAuthorityDto } from '../api/approval-matrix'

export const BRANCH_SELECT_ITEMS = BRANCHES.map((branch) => ({
  value: branch.code,
  label: branch.name,
}))

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export interface ProfileTabProps {
  profile: EditableProfile
  user: UserResponse | null
  canEdit: boolean
  isApprover: boolean
  isBranchScope: boolean
  authorities: ApprovalAuthorityDto[] | undefined
  authoritiesLoading: boolean
  onFieldChange: <K extends keyof EditableProfile>(
    field: K,
    value: EditableProfile[K],
  ) => void
}

export function ProfileTab({
  profile,
  user,
  canEdit,
  isApprover,
  isBranchScope,
  authorities,
  authoritiesLoading,
  onFieldChange,
}: ProfileTabProps) {
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-middleName">Middle Name</Label>
          <Input
            id="edit-middleName"
            value={profile.middleName}
            onChange={(e) => onFieldChange('middleName', e.target.value)}
            className="h-9"
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
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-jobTitle">
          {isApprover ? 'Approval Authority' : 'Job Title'}
        </Label>
        {isApprover ? (
          <Select
            value={profile.jobTitle}
            onValueChange={(value) => onFieldChange('jobTitle', value ?? '')}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue
                placeholder={
                  authoritiesLoading
                    ? 'Loading authorities...'
                    : 'Select approval authority'
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
        ) : (
          <Input
            id="edit-jobTitle"
            value={profile.jobTitle}
            onChange={(e) => onFieldChange('jobTitle', e.target.value)}
            placeholder="e.g. Senior Credit Evaluator"
            maxLength={100}
            className="h-9"
          />
        )}
        <p className="text-xs text-muted-foreground">
          {isApprover
            ? 'Determines which loans this approver can authorize (delegation of authority).'
            : 'Complements the workflow role and appears in loan history.'}
        </p>
      </div>

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
          items={BRANCH_SELECT_ITEMS}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {BRANCHES.map((b) => (
              <SelectItem key={b.code} value={b.code}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}