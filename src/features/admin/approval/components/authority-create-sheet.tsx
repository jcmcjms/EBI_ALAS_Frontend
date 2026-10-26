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
  emptyAuthorityFormState,
  parsedFormToPayload,
  type AuthorityFormState,
} from './authority-form-schema'
import { AuthorityFormFields } from './authority-form-fields'
import type { AuthorityLimitsPayload } from '../api/approval-authorities'

interface AuthorityCreateSheetProps {
  open: boolean
  onClose: () => void
  onCreate: (payload: AuthorityLimitsPayload) => Promise<boolean>
}

export function AuthorityCreateSheet({
  open,
  onClose,
  onCreate,
}: AuthorityCreateSheetProps) {
  const [form, setForm] = useState<AuthorityFormState>(emptyAuthorityFormState)
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
      const ok = await onCreate(parsedFormToPayload(parsed.data))
      if (ok) {
        setForm(emptyAuthorityFormState())
        onClose()
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't create the approval authority")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" showCloseButton className="sm:max-w-[460px]">
        <SheetHeader>
          <SheetTitle>New approval authority</SheetTitle>
          <SheetDescription>
            Define the limits for a new approver tier. Assign users after it is
            created.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6">
          <AuthorityFormFields
            state={form}
            onChange={patch}
            errors={errors}
            idPrefix="create"
          />
        </div>
        <SheetFooter className="mt-auto">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create authority'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
