import { Check, X } from '@phosphor-icons/react'
import { cn } from '@/src/shared/lib/utils'

const RULES = [
  {
    id: 'len',
    label: 'At least 8 characters',
    test: (pw: string) => pw.length >= 8,
  },
  {
    id: 'upper',
    label: 'One uppercase letter',
    test: (pw: string) => /[A-Z]/.test(pw),
  },
  {
    id: 'lower',
    label: 'One lowercase letter',
    test: (pw: string) => /[a-z]/.test(pw),
  },
  {
    id: 'digit',
    label: 'One number',
    test: (pw: string) => /\d/.test(pw),
  },
  {
    id: 'special',
    label: 'One of !?*.',
    test: (pw: string) => /[!?*.]/.test(pw),
  },
] as const

const STRENGTH = [
  { label: 'Too weak', bar: 'bg-destructive' },
  { label: 'Weak', bar: 'bg-destructive' },
  { label: 'Fair', bar: 'bg-amber-500' },
  { label: 'Good', bar: 'bg-emerald-500' },
  { label: 'Strong', bar: 'bg-emerald-600' },
] as const

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const met = RULES.filter((r) => r.test(password)).length
  const score = (() => {
    if (met === 0) return 0
    const bonus = password.length >= 12 ? 1 : 0
    return Math.min(4, Math.ceil((met + bonus) / 1.5))
  })()

  return (
    <div id="newPassword-rules" className="mt-2 space-y-2">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= score ? STRENGTH[score].bar : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength:{' '}
        <span className="font-medium text-foreground">
          {STRENGTH[score].label}
        </span>
      </p>
      <ul
        className="grid grid-cols-1 gap-1 sm:grid-cols-2"
        aria-live="polite"
      >
        {RULES.map((rule) => {
          const ok = rule.test(password)
          return (
            <li
              key={rule.id}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                ok ? 'text-emerald-600' : 'text-muted-foreground',
              )}
            >
              {ok ? (
                <Check size={12} weight="bold" />
              ) : (
                <X size={12} weight="bold" className="opacity-50" />
              )}
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}