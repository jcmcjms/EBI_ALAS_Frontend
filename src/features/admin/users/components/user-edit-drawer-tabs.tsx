import { Label } from '@/src/shared/ui/primitives/label'
import { Button } from '@/src/shared/ui/primitives/button'
import type { UserResponse } from '../api/users-types'

export { ProfileTab } from './user-edit-profile-tab'
export type { ProfileTabProps } from './user-edit-profile-tab'
export { RolesTab } from './user-edit-roles-tab'
export type { RolesTabProps } from './user-edit-roles-tab'

export interface SecurityTabProps {
  user: UserResponse | null
  onForcePasswordReset: (user: UserResponse) => void
  onRevokeSessions: (user: UserResponse) => void
  onResetPassword: (user: UserResponse) => void
  onToggleStatus: (user: UserResponse) => void
}

export function SecurityTab({
  user,
  onForcePasswordReset,
  onRevokeSessions,
  onResetPassword,
  onToggleStatus,
}: SecurityTabProps) {
  return (
    <>
      <div className="space-y-4">
        <Button
          variant="outline"
          className="h-9 w-full justify-start text-sm"
          onClick={() => user && onForcePasswordReset(user)}
        >
          Require a new password at next sign-in
        </Button>
        <Button
          variant="outline"
          className="h-9 w-full justify-start text-sm"
          onClick={() => user && onRevokeSessions(user)}
        >
          Sign out all devices
        </Button>
        <Button
          variant="outline"
          className="h-9 w-full justify-start text-sm"
          onClick={() => user && onResetPassword(user)}
        >
          Send password reset email
        </Button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label className="text-red-600">Account status</Label>
        {user?.isActive ? (
          <Button
            variant="destructive"
            className="h-9 w-full justify-start text-sm"
            onClick={() => user && onToggleStatus(user)}
          >
            Suspend account
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-9 w-full justify-start text-sm"
            onClick={() => user && onToggleStatus(user)}
          >
            Reactivate account
          </Button>
        )}
      </div>
    </>
  )
}
