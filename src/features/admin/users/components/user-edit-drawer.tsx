import { useMemo, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/src/shared/ui/navigation/sheet'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/src/shared/ui/navigation/tabs'
import { toastError } from '@/src/shared/ui/feedback/toast'
import type { UserResponse } from '../api/users-types'
import { stripRoleDisplayName } from '@/src/features/admin/users/components/role-badges'
import { useRoles } from '../hooks/use-roles'
import { useApprovalAuthorities } from '../hooks/use-approval-authorities'
import {
  type EditableProfile,
  type UserProfileChanges,
  profileFrom,
  emptyProfile,
} from './user-edit-drawer.types'
import {
  ProfileTab,
  SignatureTab,
  RolesTab,
  SecurityTab,
} from './user-edit-drawer-tabs'

export type { UserProfileChanges }

interface UserEditDrawerProps {
  user: UserResponse | null
  canEdit: boolean
  onClose: () => void
  onSave: (userId: number, changes: UserProfileChanges) => Promise<boolean>
  onToggleStatus: (user: UserResponse) => void
  onResetPassword: (user: UserResponse) => void
  onForcePasswordReset: (user: UserResponse) => void
  onRevokeSessions: (user: UserResponse) => void
}

export function UserEditDrawer({
  user,
  canEdit,
  onClose,
  onSave,
  onToggleStatus,
  onResetPassword,
  onForcePasswordReset,
  onRevokeSessions,
}: UserEditDrawerProps) {
  const { data: roles } = useRoles()

  const roleSelectItems = useMemo(
    () =>
      roles.map((role) => ({
        value: role.name,
        label: stripRoleDisplayName(role.displayName),
      })),
    [roles],
  )
  const [profile, setProfile] = useState<EditableProfile>(emptyProfile)
  const [eSignature, setESignature] = useState<string | null>(null)
  const [isSignatureDirty, setIsSignatureDirty] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSyncedUser, setLastSyncedUser] = useState<UserResponse | null>(
    null,
  )

  if (user !== lastSyncedUser) {
    setLastSyncedUser(user)
    setProfile(user ? profileFrom(user) : emptyProfile)
    setESignature(user?.eSignature ?? null)
    setIsSignatureDirty(false)
    setIsDirty(false)
  }

  const isApprover = profile.role === 'Approver'
  const { data: authorities, isLoading: authoritiesLoading } =
    useApprovalAuthorities(isApprover)

  const selectedAuthority = isApprover
    ? (authorities ?? []).find((a) => a.key === profile.jobTitle)
    : null
  const isBranchScope = isApprover && selectedAuthority?.scopeType === 0

  const handleFieldChange = <K extends keyof EditableProfile>(
    field: K,
    value: EditableProfile[K],
  ) => {
    setProfile((prev) => {
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
    setIsDirty(true)
  }

  const handleSignatureChange = (base64: string | null) => {
    setESignature(base64)
    setIsSignatureDirty(true)
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!user || !isDirty || isSaving) return

    if (!profile.firstName.trim()) {
      toastError('First name is required')
      return
    }
    if (!profile.lastName.trim()) {
      toastError('Last name is required')
      return
    }
    if (profile.role === 'Approver' && !profile.jobTitle) {
      toastError('Please select an approval authority for this Approver.')
      return
    }

    if (
      profile.role === 'Approver' &&
      isBranchScope &&
      profile.coveredBranches.length === 0
    ) {
      toastError(
        'Please select at least one covered branch for this Branch-scope approver.',
      )
      return
    }
    if (profile.role !== 'Approver' && profile.jobTitle.length > 100) {
      toastError('Job title must not exceed 100 characters')
      return
    }

    setIsSaving(true)
    try {
      const changes: UserProfileChanges = {
        firstName: profile.firstName.trim(),
        middleName: profile.middleName.trim(),
        lastName: profile.lastName.trim(),
        branchId: profile.branchId,
        role: profile.role,
        jobTitle: profile.jobTitle.trim() || null,
        ...(isBranchScope && profile.coveredBranches.length > 0
          ? { coveredBranches: profile.coveredBranches }
          : {}),
      }
      if (isSignatureDirty) {
        changes.eSignature = eSignature
      }

      const success = await onSave(user.id, changes)
      if (success) {
        setIsDirty(false)
        setIsSignatureDirty(false)
        onClose()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const fullName = user
    ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
    : ''

  return (
    <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col p-0 sm:max-w-[500px]">
        <SheetHeader className="border-b bg-muted/30 p-6 pb-4">
          <SheetTitle>Edit User{fullName ? `: ${fullName}` : ''}</SheetTitle>
          <SheetDescription>
            Manage user profile, roles, and security settings.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          defaultValue="profile"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="signature">Signature</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="profile"
            className="mt-0 flex-1 space-y-4 overflow-y-auto p-6"
          >
            <ProfileTab
              profile={profile}
              user={user}
              canEdit={canEdit}
              isApprover={isApprover}
              isBranchScope={isBranchScope}
              authorities={authorities}
              authoritiesLoading={authoritiesLoading}
              onFieldChange={handleFieldChange}
            />
          </TabsContent>

          <TabsContent
            value="signature"
            className="mt-0 flex-1 space-y-4 overflow-y-auto p-6"
          >
            <SignatureTab
              eSignature={eSignature}
              canEdit={canEdit}
              isSignatureDirty={isSignatureDirty}
              onSignatureChange={handleSignatureChange}
            />
          </TabsContent>

          <TabsContent
            value="roles"
            className="mt-0 flex-1 space-y-4 overflow-y-auto p-6"
          >
            <RolesTab
              profile={profile}
              isApprover={isApprover}
              isBranchScope={isBranchScope}
              canEdit={canEdit}
              authorities={authorities}
              authoritiesLoading={authoritiesLoading}
              onFieldChange={handleFieldChange}
              roleSelectItems={roleSelectItems}
              roles={roles}
            />
          </TabsContent>

          <TabsContent
            value="security"
            className="mt-0 flex-1 space-y-4 overflow-y-auto p-6"
          >
            <SecurityTab
              user={user}
              onForcePasswordReset={onForcePasswordReset}
              onRevokeSessions={onRevokeSessions}
              onResetPassword={onResetPassword}
              onToggleStatus={onToggleStatus}
            />
          </TabsContent>
        </Tabs>

        <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
          <Button variant="outline" className="h-9" onClick={onClose}>
            Cancel
          </Button>
          {canEdit ? (
            <Button
              className="h-9"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          ) : (
            <p className="self-center text-xs text-muted-foreground">
              You don't have permission to edit users.
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}