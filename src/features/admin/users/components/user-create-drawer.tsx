import { useMemo, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/src/shared/ui/sheet'
import { Button } from '@/src/shared/ui/button'
import { Input } from '@/src/shared/ui/input'
import { Label } from '@/src/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/select'
import { SignaturePad } from '@/src/shared/ui/signature-pad'
import { BranchMultiSelect } from '@/src/shared/ui/branch-multi-select'
import { toastError } from '@/src/shared/ui/toast'
import { BRANCHES } from '@/src/shared/lib/api/types'
import { stripRoleDisplayName } from '@/src/features/admin/users/components/role-badges'
import { useRoles } from '../hooks/use-roles'
import { useApprovalAuthorities } from '../hooks/use-approval-authorities'

export interface UserCreatePayload {
  username: string
  password: string
  firstName: string
  middleName: string
  lastName: string
  branchId: string
  role: string
  jobTitle: string
  eSignature: string | null
  coveredBranches: string[] | null
}

interface UserCreateDrawerProps {
  open: boolean
  onClose: () => void

  onCreate: (payload: UserCreatePayload) => Promise<boolean>
}

const emptyForm = {
  username: '',
  firstName: '',
  middleName: '',
  lastName: '',
  jobTitle: '',
  branchId: '',
  role: '',
  eSignature: null as string | null,
  coveredBranches: [] as string[],
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/

const BRANCH_SELECT_ITEMS = BRANCHES.map((branch) => ({
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

function generateTempPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const specials = '!?*.'
  const all = upper + lower + digits + specials

  const pick = (set: string) => {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return set[buf[0] % set.length]
  }

  const chars = [pick(upper), pick(lower), pick(digits), pick(specials)]
  while (chars.length < length) chars.push(pick(all))

  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export function UserCreateDrawer({
  open,
  onClose,
  onCreate,
}: UserCreateDrawerProps) {
  const { data: roles } = useRoles()

  const roleSelectItems = useMemo(
    () =>
      roles.map((role) => ({
        value: role.name,
        label: stripRoleDisplayName(role.displayName),
      })),
    [roles],
  )
  const [form, setForm] = useState(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isApprover = form.role === 'Approver'
  const { data: authorities, isLoading: authoritiesLoading } =
    useApprovalAuthorities(isApprover)

  const selectedAuthority = isApprover
    ? (authorities ?? []).find((a) => a.key === form.jobTitle)
    : null
  const isBranchScope = isApprover && selectedAuthority?.scopeType === 0

  const handleFieldChange = <K extends keyof typeof emptyForm>(
    field: K,
    value: (typeof emptyForm)[K],
  ) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'role' && value !== 'Approver') {
        next.jobTitle = ''
        next.coveredBranches = []
      }

      if (field === 'role' && value === 'Approver') {
        next.jobTitle = ''
        next.coveredBranches = []
      }

      if (field === 'jobTitle' && prev.role === 'Approver') {
        const selectedAuth = (authorities ?? []).find((a) => a.key === value)
        if (selectedAuth && selectedAuth.scopeType !== 0) {
          next.coveredBranches = []
        }
      }
      return next
    })
  }

  const handleCreate = async () => {
    if (!form.username.trim()) {
      toastError('Username is required')
      return
    }
    if (!USERNAME_PATTERN.test(form.username.trim())) {
      toastError(
        'Username must be alphanumeric (letters, numbers, underscores)',
      )
      return
    }
    if (form.username.trim().length > 50) {
      toastError('Username must not exceed 50 characters')
      return
    }
    if (!form.firstName.trim()) {
      toastError('First name is required')
      return
    }
    if (!form.lastName.trim()) {
      toastError('Last name is required')
      return
    }
    if (form.jobTitle.length > 100) {
      toastError('Job title must not exceed 100 characters')
      return
    }
    if (!form.branchId) {
      toastError('Branch is required')
      return
    }
    if (!form.role) {
      toastError('Role is required')
      return
    }

    if (form.role === 'Approver' && !form.jobTitle) {
      toastError('Please select an approval authority for this Approver.')
      return
    }

    if (
      form.role === 'Approver' &&
      isBranchScope &&
      form.coveredBranches.length === 0
    ) {
      toastError(
        'Please select at least one covered branch for this Branch-scope approver.',
      )
      return
    }
    if (!form.eSignature) {
      toastError('Signature is required. Please sign the pad.')
      return
    }

    setIsSubmitting(true)
    try {
      const tempPassword = generateTempPassword()
      const success = await onCreate({
        username: form.username.trim(),
        password: tempPassword,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        jobTitle: form.jobTitle.trim(),
        branchId: form.branchId,
        role: form.role,
        eSignature: form.eSignature,

        coveredBranches:
          isBranchScope && form.coveredBranches.length > 0
            ? form.coveredBranches
            : null,
      })
      if (!success) return

      setForm(emptyForm)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setForm(emptyForm)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && handleCancel()}>
      <SheetContent className="flex flex-col p-0 sm:max-w-[500px]">
        <SheetHeader className="border-b bg-muted/30 p-6 pb-4">
          <SheetTitle>Create New User</SheetTitle>
          <SheetDescription>
            Add a new user to the ALAS system.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="space-y-2">
            <Label htmlFor="create-username">Username *</Label>
            <Input
              id="create-username"
              value={form.username}
              onChange={(e) => handleFieldChange('username', e.target.value)}
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
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                placeholder="Juan"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-middleName">Middle Name</Label>
              <Input
                id="create-middleName"
                value={form.middleName}
                onChange={(e) =>
                  handleFieldChange('middleName', e.target.value)
                }
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
              onChange={(e) => handleFieldChange('lastName', e.target.value)}
              placeholder="Dela Cruz"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-branch">Assigned Branch *</Label>
            <Select
              value={form.branchId}
              onValueChange={(value) =>
                handleFieldChange('branchId', value ?? '')
              }
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
              onValueChange={(value) => handleFieldChange('role', value ?? '')}
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

          {}
          <div className="space-y-2">
            <Label htmlFor="create-jobTitle">
              {isApprover ? 'Approval Authority *' : 'Job Title'}
            </Label>
            {isApprover ? (
              <Select
                value={form.jobTitle}
                onValueChange={(value) =>
                  handleFieldChange('jobTitle', value ?? '')
                }
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
                onChange={(e) => handleFieldChange('jobTitle', e.target.value)}
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

          {}
          {isBranchScope && (
            <div className="space-y-2">
              <Label>Covered Branches *</Label>
              <BranchMultiSelect
                branches={BRANCHES}
                selected={form.coveredBranches}
                onChange={(codes) =>
                  handleFieldChange('coveredBranches', codes)
                }
                placeholder="Select branches this approver covers"
              />
              <p className="text-xs text-muted-foreground">
                This approver can authorize loans from the selected branches.
              </p>
            </div>
          )}

          {}
          <div className="space-y-2">
            <Label htmlFor="create-signature">E-Signature *</Label>
            <SignaturePad
              value={form.eSignature}
              onChange={(base64) => handleFieldChange('eSignature', base64)}
              heightClassName="h-40"
            />
            <p className="text-xs text-muted-foreground">
              Required for audit compliance. The signature will appear on loan
              approval forms.
            </p>
          </div>
        </div>

        <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
          <Button variant="outline" className="h-9" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            className="h-9"
            onClick={handleCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
