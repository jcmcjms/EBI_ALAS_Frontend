import { useState } from 'react'
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
import {
  authorityFormSchema,
  authorityToFormState,
  parsedFormToPayload,
  type AuthorityFormState,
} from './authority-form-schema'
import { AuthorityFormFields } from './authority-form-fields'
import type {
  ApprovalAuthorityDto,
  AuthorityLimitsPayload,
} from '../api/approval-authorities'

interface AuthorityEditSheetProps {
  authority: ApprovalAuthorityDto | null
  onClose: () => void
  onUpdate: (key: string, payload: AuthorityLimitsPayload) => Promise<boolean>
}

export function AuthorityEditSheet({
  authority,
  onClose,
  onUpdate,
}: AuthorityEditSheetProps) {
  if (!authority) return null
  return (
    <AuthorityEditSheetInner
      key={authority.key}
      authority={authority}
      onClose={onClose}
      onUpdate={onUpdate}
    />
  )
}

function AuthorityEditSheetInner({
  authority,
  onClose,
  onUpdate,
}: {
  authority: ApprovalAuthorityDto
  onClose: () => void
  onUpdate: (key: string, payload: AuthorityLimitsPayload) => Promise<boolean>
}) {
  const [form, setForm] = useState<AuthorityFormState>(() =>
    authorityToFormState(authority),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<
    Partial<Record<keyof AuthorityFormState, string>>
  >({})

  const patch = (p: Partial<AuthorityFormState>) =>
    setForm((prev) => ({ ...prev, ...p }))

  const handleSubmit = async () => {
    const parsed = authorityFormSchema.safeParse(form)
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AuthorityFormState
        next[key] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    setIsSubmitting(true)
    try {
      const ok = await onUpdate(authority.key, parsedFormToPayload(parsed.data))
      if (ok) onClose()
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't save the approval authority")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" showCloseButton className="sm:max-w-[460px]">
        <SheetHeader>
          <SheetTitle>Edit {authority.displayName}</SheetTitle>
          <SheetDescription>Update the limits for this approval tier.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6">
          <AuthorityFormFields
            state={form}
            onChange={patch}
            errors={errors}
            idPrefix="edit"
          />
        </div>
        <SheetFooter className="mt-auto">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
