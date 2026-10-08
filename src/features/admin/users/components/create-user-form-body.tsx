import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/forms/select'
import { SignaturePad } from '@/src/shared/ui/forms/signature-pad'
import { BranchMultiSelect } from '@/src/shared/ui/data-display/branch-multi-select'
import { BRANCHES } from '@/src/shared/lib/api/types'
import { stripRoleDisplayName } from '@/src/features/admin/users/components/role-badges'
import { BRANCH_SELECT_ITEMS, formatPhp } from './user-create-drawer.types'
import type { ApprovalAuthorityDto } from '../api/approval-matrix'

interface FormState {
  username: string
  firstName: string
  middleName: string
  lastName: string
  jobTitle: string
  branchId: string
  role: string
  eSignature: string | null
  coveredBranches: string[]
}

export interface CreateUserFormBodyProps {
  form: FormState
  onFieldChange: <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => void
  isApprover: boolean
  isBranchScope: boolean
  authorities: ApprovalAuthorityDto[] | undefined
  authoritiesLoading: boolean
  roleSelectItems: { value: string; label: string }[]
  roles: { name: string; displayName: string }[]
}

export function CreateUserFormBody({
  form,
  onFieldChange,
  isApprover,
  isBranchScope,
  authorities,
  authoritiesLoading,
  roleSelectItems,
  roles,
}: CreateUserFormBodyProps) {
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

      <div className="space-y-2">
        <Label htmlFor="create-jobTitle">
          {isApprover ? 'Approval Authority *' : 'Job Title'}
        </Label>
        {isApprover ? (
          <Select
            value={form.jobTitle}
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
            id="create-jobTitle"
            value={form.jobTitle}
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
            selected={form.coveredBranches}
            onChange={(codes) => onFieldChange('coveredBranches', codes)}
            placeholder="Select branches this approver covers"
          />
          <p className="text-xs text-muted-foreground">
            This approver can authorize loans from the selected branches.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="create-signature">E-Signature *</Label>
        <SignaturePad
          value={form.eSignature}
          onChange={(base64) => onFieldChange('eSignature', base64)}
          heightClassName="h-40"
        />
        <p className="text-xs text-muted-foreground">
          Required for audit compliance. The signature will appear on loan
          approval forms.
        </p>
      </div>
    </div>
  )
}