import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import {
  CircleNotch,
  Eye,
  EyeSlash,
  Check,
  WarningCircle,
} from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import { Field, FieldGroup, FieldLabel } from '@/src/shared/ui/forms/field'
import { Input } from '@/src/shared/ui/primitives/input'
import type { ChangePasswordFormData } from '../schemas'
import { PasswordStrengthIndicator } from './password-strength-indicator'

function RevealToggle({
  revealed,
  onToggle,
  label,
}: {
  revealed: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={revealed}
    >
      {revealed ? (
        <EyeSlash size={16} weight="bold" />
      ) : (
        <Eye size={16} weight="bold" />
      )}
    </Button>
  )
}

interface PasswordChangeFormProps {
  register: UseFormRegister<ChangePasswordFormData>
  errors: FieldErrors<ChangePasswordFormData>
  onSubmit: (e?: React.BaseSyntheticEvent) => void
  isSubmitting: boolean
  mustChange: boolean
  reveal: { current: boolean; next: boolean; confirm: boolean }
  setReveal: React.Dispatch<
    React.SetStateAction<{
      current: boolean
      next: boolean
      confirm: boolean
    }>
  >
  capsOn: boolean
  newPassword: string
  confirmPassword: string
  onBack: () => void
}

export function PasswordChangeForm({
  register,
  errors,
  onSubmit,
  isSubmitting,
  mustChange,
  reveal,
  setReveal,
  capsOn,
  newPassword,
  confirmPassword,
  onBack,
}: PasswordChangeFormProps) {
  const matches = confirmPassword.length > 0 && confirmPassword === newPassword

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6 rounded-lg border bg-card p-8 shadow-sm"
      noValidate
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Update your password</h1>
          <p className="text-sm text-muted-foreground">
            {mustChange
              ? 'Your temporary password must be changed before you can access ALAS.'
              : 'Choose a new password for your account.'}
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="currentPassword">
            Current Password
          </FieldLabel>
          <div className="relative">
            <Input
              id="currentPassword"
              type={reveal.current ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus
              aria-invalid={!!errors.currentPassword}
              aria-describedby={
                errors.currentPassword
                  ? 'currentPassword-error'
                  : undefined
              }
              className="pr-10"
              {...register('currentPassword')}
            />
            <RevealToggle
              revealed={reveal.current}
              onToggle={() =>
                setReveal((r) => ({
                  ...r,
                  current: !r.current,
                }))
              }
              label={
                reveal.current
                  ? 'Hide current password'
                  : 'Show current password'
              }
            />
          </div>
          {errors.currentPassword && (
            <p
              id="currentPassword-error"
              role="alert"
              className="mt-1 text-xs text-destructive"
            >
              {errors.currentPassword.message}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
          <div className="relative">
            <Input
              id="newPassword"
              type={reveal.next ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              aria-describedby="newPassword-rules"
              className="pr-10"
              {...register('newPassword')}
            />
            <RevealToggle
              revealed={reveal.next}
              onToggle={() =>
                setReveal((r) => ({
                  ...r,
                  next: !r.next,
                }))
              }
              label={
                reveal.next ? 'Hide new password' : 'Show new password'
              }
            />
          </div>

          <PasswordStrengthIndicator password={newPassword} />

          {errors.newPassword && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.newPassword.message}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">
            Confirm New Password
          </FieldLabel>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={reveal.confirm ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={
                matches ? 'confirmPassword-ok' : undefined
              }
              className="pr-10"
              {...register('confirmPassword')}
            />
            <RevealToggle
              revealed={reveal.confirm}
              onToggle={() =>
                setReveal((r) => ({
                  ...r,
                  confirm: !r.confirm,
                }))
              }
              label={
                reveal.confirm ? 'Hide confirmation' : 'Show confirmation'
              }
            />
          </div>
          {matches && !errors.confirmPassword && (
            <p
              id="confirmPassword-ok"
              className="mt-1 flex items-center gap-1 text-xs text-emerald-600"
            >
              <Check size={12} weight="bold" /> Passwords match
            </p>
          )}
          {errors.confirmPassword && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </Field>

        {capsOn && (
          <p
            role="status"
            className="flex items-center gap-1.5 text-xs text-amber-700"
          >
            <WarningCircle size={12} weight="fill" /> Caps Lock is on.
          </p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full gap-2"
        >
          {isSubmitting && (
            <CircleNotch
              size={16}
              weight="bold"
              className="animate-spin"
            />
          )}
          {isSubmitting ? 'Updating…' : 'Update Password'}
        </Button>

        {!mustChange && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mx-auto"
            onClick={onBack}
          >
            Back
          </Button>
        )}
      </FieldGroup>
    </form>
  )
}