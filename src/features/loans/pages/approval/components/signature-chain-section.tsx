import { memo, useState } from 'react'
import { CheckCircle, PenNib } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { cn } from '@/src/shared/lib/utils'
import type { SignatureDisplaySlot } from '@/src/features/loans/api/signatures'

interface SignatureChainSectionProps {
  slots: SignatureDisplaySlot[]
}

function isSigned(slot: SignatureDisplaySlot): boolean {
  return Boolean(slot.signedAt)
}

function formatSignedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function SignatureField({ slot }: { slot: SignatureDisplaySlot }) {
  const signed = isSigned(slot)
  const name = slot.signedByName?.trim() || null
  const title = slot.signedByJobTitle?.trim() || slot.jobTitle || null
  const url = slot.signatureUrl ?? null
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showInk = signed && url !== null && failedUrl !== url

  return (
    <li
      aria-label={`${slot.action} — ${
        signed && name ? `signed by ${name}` : 'awaiting signature'
      }`}
      className="flex flex-col rounded-lg border border-input bg-background p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Step {slot.order}
          </p>
          <h4 className="truncate text-sm font-semibold">{slot.action}</h4>
          <p className="truncate text-xs text-muted-foreground">{slot.role}</p>
        </div>
        {signed ? (
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-300 bg-emerald-50 font-normal text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
          >
            <CheckCircle size={12} weight="bold" aria-hidden="true" />
            Signed
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-500/10 font-normal text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400"
          >
            Pending
          </Badge>
        )}
      </div>

      <span className="mt-3 text-xs font-medium text-muted-foreground">
        Signature
      </span>
      <div
        className={cn(
          'mt-1.5 flex h-20 flex-col items-center justify-center gap-1 rounded-md border px-3 text-center',
          signed
            ? 'border-input bg-background'
            : 'border-dashed border-input bg-muted/30',
        )}
      >
        {signed ? (
          showInk ? (
            <img
              src={url}
              alt={`Signature of ${name ?? slot.role}`}
              className="max-h-12 w-auto object-contain"
              onError={() => setFailedUrl(url)}
            />
          ) : (
            <span className="text-base font-semibold italic tracking-tight">
              /s/ {name}
            </span>
          )
        ) : (
          <>
            <PenNib
              size={18}
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate text-xs font-medium text-muted-foreground">
              {name ?? 'Awaiting signature'}
            </span>
          </>
        )}
        {signed && title ? (
          <span className="truncate text-[11px] text-muted-foreground">
            {title}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Date signed</span>
        <span className="font-medium tabular-nums">
          {slot.signedAt ? formatSignedAt(slot.signedAt) : '—'}
        </span>
      </div>
    </li>
  )
}

export const SignatureChainSection = memo(function SignatureChainSection({
  slots,
}: SignatureChainSectionProps) {
  const signedCount = slots.filter(isSigned).length

  return (
    <section
      aria-label="Authorization signatures"
      className="break-inside-avoid border-t-2 border-black p-3 font-sans print:hidden"
    >
      <div className="rounded-lg border border-input bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Authorization Signatures</h3>
          <Badge variant="secondary" className="tabular-nums">
            {`${signedCount} of ${slots.length} signed`}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Each stage is signed automatically when its workflow action is
          completed.
        </p>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {slots.map((slot) => (
            <SignatureField key={slot.order} slot={slot} />
          ))}
        </ol>
      </div>
    </section>
  )
})
