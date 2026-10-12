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
import {
  type UserCreatePayload,
  emptyForm,
  USERNAME_PATTERN,
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

  const handleFieldChange = <K extends keyof typeof emptyForm>(
    field: K,
    value: (typeof emptyForm)[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
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
    if (!form.branchId) {
      toastError('Branch is required')
      return
    }
    if (!form.role) {
      toastError('Role is required')
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
        branchId: form.branchId,
        role: form.role,
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

        <CreateUserFormBody
          form={form}
          onFieldChange={handleFieldChange}
          roleSelectItems={roleSelectItems}
          roles={roles}
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
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
