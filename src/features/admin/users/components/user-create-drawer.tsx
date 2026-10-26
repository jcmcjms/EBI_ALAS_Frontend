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
import { toastError } from '@/src/shared/ui/feedback/toast'
import { stripRoleDisplayName } from '@/src/features/admin/users/components/role-badges'
import { useRoles } from '../hooks/use-roles'
import { assignableRoles } from '../api/roles'
import {
  type UserCreatePayload,
  emptyForm,
  USERNAME_PATTERN,
  EMAIL_PATTERN,
  generateTempPassword,
} from './user-create-drawer.types'
import { CreateUserFormBody } from './create-user-form-body'

export type { UserCreatePayload }

interface UserCreateDrawerProps {
  open: boolean
  onClose: () => void
  onCreate: (payload: UserCreatePayload) => Promise<boolean>
}

export function UserCreateDrawer({
  open,
  onClose,
  onCreate,
}: UserCreateDrawerProps) {
  const { data: roles } = useRoles()
  const assignable = useMemo(() => assignableRoles(roles), [roles])

  const roleSelectItems = useMemo(
    () =>
      assignable.map((role) => ({
        value: role.name,
        label: stripRoleDisplayName(role.displayName),
      })),
    [assignable],
  )
  const [form, setForm] = useState(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFieldChange = <K extends keyof typeof emptyForm>(
    field: K,
    value: (typeof emptyForm)[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreate = async () => {
    if (!form.username.trim()) {
      toastError('Enter a username')
      return
    }
    if (!USERNAME_PATTERN.test(form.username.trim())) {
      toastError('Use only letters, numbers, and underscores in the username')
      return
    }
    if (form.username.trim().length > 50) {
      toastError('Username must be 50 characters or fewer')
      return
    }
    if (!form.firstName.trim()) {
      toastError('Enter a first name')
      return
    }
    if (!form.lastName.trim()) {
      toastError('Enter a last name')
      return
    }
    if (!form.email.trim()) {
      toastError('Enter the email address used for password resets')
      return
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      toastError('Enter a valid email address')
      return
    }
    if (!form.branchId) {
      toastError('Select a branch')
      return
    }
    if (!form.role) {
      toastError('Select a role')
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
        email: form.email.trim(),
        branchId: form.branchId,
        role: form.role,
        jobTitle: form.jobTitle.trim(),
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
          <SheetTitle>Create user</SheetTitle>
          <SheetDescription>
            They sign in with a temporary password and choose a new one at
            first sign-in.
          </SheetDescription>
        </SheetHeader>

        <CreateUserFormBody
          form={form}
          onFieldChange={handleFieldChange}
          roleSelectItems={roleSelectItems}
          roles={assignable}
        />

        <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
          <Button variant="outline" className="h-9" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            className="h-9"
            onClick={handleCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating…' : 'Create user'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
