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
import {
  createBranchSchema,
  emptyCreateForm,
  type CreateBranchForm,
} from './branch-form-schema'

interface BranchCreateSheetProps {
  open: boolean
  onClose: () => void
  onCreate: (payload: CreateBranchForm) => Promise<boolean>
}

export function BranchCreateSheet({
  open,
  onClose,
  onCreate,
}: BranchCreateSheetProps) {
  const [form, setForm] = useState(emptyCreateForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateBranchForm, string>>>({})

  const handleSubmit = async () => {
    const parsed = createBranchSchema.safeParse(form)
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CreateBranchForm
        next[key] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    setIsSubmitting(true)
    try {
      const ok = await onCreate(parsed.data)
      if (ok) {
        setForm(emptyCreateForm)
        onClose()
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't create the branch")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" showCloseButton className="sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>Create branch</SheetTitle>
          <SheetDescription>
            Add a branch to the directory. The code is permanent and must
            match the core banking system.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6">
          <div className="space-y-2">
            <Label htmlFor="branch-code">Code</Label>
            <Input
              id="branch-code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              maxLength={8}
              placeholder="e.g. 040"
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-name">Name</Label>
            <Input
              id="branch-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              maxLength={200}
              placeholder="e.g. Davao-Matina Branch"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-area">Area code</Label>
            <Input
              id="branch-area"
              value={form.areaCode}
              onChange={(e) =>
                setForm((p) => ({ ...p, areaCode: e.target.value }))
              }
              maxLength={16}
              placeholder="e.g. MINDANAO"
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
            {isSubmitting ? 'Creating…' : 'Create branch'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
