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
import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import { toastError } from '@/src/shared/ui/feedback/toast'
import type { BranchResponse } from '@/src/shared/lib/api/types'
import {
  updateBranchSchema,
  type UpdateBranchForm,
} from './branch-form-schema'

interface BranchEditSheetProps {
  branch: BranchResponse | null
  onClose: () => void
  onUpdate: (code: string, payload: UpdateBranchForm) => Promise<boolean>
}

export function BranchEditSheet({
  branch,
  onClose,
  onUpdate,
}: BranchEditSheetProps) {
  if (!branch) return null
  return (
    <BranchEditSheetInner
      key={branch.code}
      branch={branch}
      onClose={onClose}
      onUpdate={onUpdate}
    />
  )
}

function BranchEditSheetInner({
  branch,
  onClose,
  onUpdate,
}: {
  branch: BranchResponse
  onClose: () => void
  onUpdate: (code: string, payload: UpdateBranchForm) => Promise<boolean>
}) {
  const [form, setForm] = useState<UpdateBranchForm>({
    name: branch.name,
    areaCode: branch.areaCode,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<
    Partial<Record<keyof UpdateBranchForm, string>>
  >({})

  const handleSubmit = async () => {
    const parsed = updateBranchSchema.safeParse(form)
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof UpdateBranchForm
        next[key] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    setIsSubmitting(true)
    try {
      const ok = await onUpdate(branch.code, parsed.data)
      if (ok) onClose()
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't save the branch")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" showCloseButton className="sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>Edit branch {branch.code}</SheetTitle>
          <SheetDescription>
            The branch code can't be changed.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6">
          <div className="space-y-2">
            <Label htmlFor="edit-branch-code">Code</Label>
            <Input id="edit-branch-code" value={branch.code} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-branch-name">Name</Label>
            <Input
              id="edit-branch-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              maxLength={200}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-branch-area">Area code</Label>
            <Input
              id="edit-branch-area"
              value={form.areaCode}
              onChange={(e) =>
                setForm((p) => ({ ...p, areaCode: e.target.value }))
              }
              maxLength={16}
            />
            {errors.areaCode && (
              <p className="text-xs text-destructive">{errors.areaCode}</p>
            )}
          </div>
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
