import { useEffect, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '@/src/shared/ui/primitives/button'
import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/src/shared/ui/navigation/sheet'
import { SignaturePad } from '@/src/shared/ui/forms/signature-pad'
import { useAccountProfile, useUpdateProfile } from '../hooks/use-account'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/

const profileSchema = z.object({
  email: z
    .string()
    .trim()
    .max(100, 'Email must not exceed 100 characters.')
    .refine(
      (v) => v === '' || EMAIL_PATTERN.test(v),
      'Enter a valid email address.',
    ),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone must not exceed 20 characters.')
    .refine(
      (v) => v === '' || PHONE_PATTERN.test(v),
      'Enter a valid phone number (digits, spaces, + - ( )).',
    ),
  emergencyContact: z
    .string()
    .trim()
    .max(200, 'Emergency contact must not exceed 200 characters.'),
})

interface ProfileEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileEditSheet({
  open,
  onOpenChange,
}: ProfileEditSheetProps) {
  const { data: profile } = useAccountProfile()
  const updateProfile = useUpdateProfile()

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open || !profile) return
    setEmail(profile.email ?? '')
    setPhone(profile.phone ?? '')
    setEmergencyContact(profile.emergencyContact ?? '')
    setSignature(profile.eSignature ?? null)
    setErrors({})
  }, [open, profile])

  const hasStoredSignature = Boolean(profile?.eSignature)
  const signatureMissing = !hasStoredSignature && !signature

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const parsed = profileSchema.safeParse({ email, phone, emergencyContact })
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            issue.path[0] as string,
            issue.message,
          ]),
        ),
      )
      return
    }

    if (signatureMissing) {
      setErrors((prev) => ({
        ...prev,
        signature: 'E-signature is required. Sign the pad to continue.',
      }))
      return
    }

    updateProfile.mutate(
      {
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        emergencyContact: parsed.data.emergencyContact || null,
        
        eSignature: signature ?? '',
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Contact details are used for loan action tracing. An e-signature is
            required for audit compliance and appears on loan forms.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pt-2 pb-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              autoComplete="email"
              placeholder="name@enterprisebank.ph"
              value={email}
              aria-invalid={Boolean(errors.email)}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+63 912 345 6789"
              value={phone}
              aria-invalid={Boolean(errors.phone)}
              onChange={(e) => setPhone(e.target.value)}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-emergency">Emergency contact</Label>
            <Input
              id="profile-emergency"
              placeholder="Name — +63 912 345 6789"
              value={emergencyContact}
              aria-invalid={Boolean(errors.emergencyContact)}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
            {errors.emergencyContact && (
              <p className="text-xs text-destructive">
                {errors.emergencyContact}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="profile-signature">E-Signature</Label>
              {signature && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSignature(null)}
                >
                  Clear
                </Button>
              )}
            </div>
            <SignaturePad
              value={signature}
              onChange={setSignature}
              heightClassName="h-36"
            />
            <p className="text-xs text-muted-foreground">
              {hasStoredSignature && profile && signature === profile.eSignature
                ? 'Signature on file. Redraw to replace it.'
                : 'Sign inside the box. Required until a signature is saved.'}
            </p>
            {errors.signature && (
              <p role="alert" className="text-xs text-destructive">
                {errors.signature}
              </p>
            )}
          </div>

          <SheetFooter className="-mx-4 mt-auto gap-2 border-t bg-muted/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
