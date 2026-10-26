export const ACCOUNT_TABS = [
  'overview',
  'security',
  'activity',
  'my-applications',
] as const

export type AccountTab = (typeof ACCOUNT_TABS)[number]

export function parseAccountTab(raw: string | null): AccountTab {
  return ACCOUNT_TABS.find((tab) => tab === raw) ?? 'overview'
}

export type ActivityKind =
  'application' | 'approval' | 'security' | 'draft' | 'login'

export const ACTIVITY_META: Record<
  ActivityKind,
  {
    icon:
      'ClipboardText' | 'CheckCircle' | 'LockSimple' | 'FloppyDisk' | 'SignIn'
    label: string
  }
> = {
  application: { icon: 'ClipboardText', label: 'Application' },
  approval: { icon: 'CheckCircle', label: 'Approval' },
  security: { icon: 'LockSimple', label: 'Security' },
  draft: { icon: 'FloppyDisk', label: 'Draft' },
  login: { icon: 'SignIn', label: 'Sign-in' },
}

export const DUTY_ROLES = ['Evaluator', 'Approver', 'Admin'] as const

export function isDutyRole(role: string | null | undefined): boolean {
  return Boolean(role) && (DUTY_ROLES as readonly string[]).includes(role!)
}

export const PASSWORD_POLICY = [
  'Minimum 12 characters',
  'Maximum 128 characters',
  'Use a passphrase you can remember but others cannot guess',
] as const
