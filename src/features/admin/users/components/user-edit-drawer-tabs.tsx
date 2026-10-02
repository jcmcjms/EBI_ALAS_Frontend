import { Label } from '@/src/shared/ui/label'
import { Button } from '@/src/shared/ui/button'
import { SignaturePad } from '@/src/shared/ui/signature-pad'
import type { UserResponse } from '@/src/shared/lib/api/types'

export { BRANCH_SELECT_ITEMS, ProfileTab } from './user-edit-profile-tab'
export type { ProfileTabProps } from './user-edit-profile-tab'
export { RolesTab } from './user-edit-roles-tab'
export type { RolesTabProps } from './user-edit-roles-tab'

export interface SignatureTabProps {
  eSignature: string | null
  canEdit: boolean
  isSignatureDirty: boolean
  onSignatureChange: (base64: string | null) => void
}

export function SignatureTab({
  eSignature,
  canEdit,
  isSignatureDirty,
  onSignatureChange,
}: SignatureTabProps) {
  return (
    <div className="space-y-2">
      <Label>E-Signature</Label>
      <SignaturePad
        value={eSignature}
        onChange={onSignatureChange}
        disabled={!canEdit}
      />
      <p className="text-xs text-muted-foreground">
        Captured as a small PNG and stamped on generated documents (approvals,
        recommendation sheets, etc.).
      </p>
      {isSignatureDirty && (
        <p className="text-xs font-medium text-amber-600">
          Unsaved signature changes will be applied on Save.
        </p>
      )}
    </div>
  )
}

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
          Force Password Reset on Next Login
        </Button>
        <Button
          variant="outline"
          className="h-9 w-full justify-start text-sm"
          onClick={() => user && onRevokeSessions(user)}
        >
          Revoke All Active Sessions
        </Button>
        <Button
          variant="outline"
          className="h-9 w-full justify-start text-sm"
          onClick={() => user && onResetPassword(user)}
        >
          Send Password Reset Email
        </Button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label className="text-red-600">Danger Zone</Label>
        {user?.isActive ? (
          <Button
            variant="destructive"
            className="h-9 w-full justify-start text-sm"
            onClick={() => user && onToggleStatus(user)}
          >
            Suspend Account
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-9 w-full justify-start text-sm"
            onClick={() => user && onToggleStatus(user)}
          >
            Reactivate Account
          </Button>
        )}
      </div>
    </>
  )
}