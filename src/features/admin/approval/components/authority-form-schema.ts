import { z } from 'zod'
import type {
  ApprovalAuthorityDto,
  AuthorityLimitsPayload,
} from '../api/approval-authorities'

export const authorityFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
  tier: z.coerce
    .number()
    .int('Tier must be a whole number')
    .min(1, 'Tier must be at least 1'),
  priority: z.coerce
    .number()
    .int('Priority must be a whole number')
    .min(0, 'Priority must be 0 or greater'),
  maxTotalExposure: z.coerce
    .number()
    .min(0, 'Max exposure must be 0 or greater'),
  maxSeverity: z.coerce.number().int().min(0).max(2),
  scopeType: z.coerce.number().int().min(0).max(2),
  allowNew: z.boolean(),
  allowRenewal: z.boolean(),
})

export type AuthorityFormValues = z.infer<typeof authorityFormSchema>

export interface AuthorityFormState {
  displayName: string
  tier: string
  priority: string
  maxTotalExposure: string
  maxSeverity: string
  scopeType: string
  allowNew: boolean
  allowRenewal: boolean
}

export function emptyAuthorityFormState(): AuthorityFormState {
  return {
    displayName: '',
    tier: '1',
    priority: '0',
    maxTotalExposure: '0',
    maxSeverity: '0',
    scopeType: '0',
    allowNew: false,
    allowRenewal: false,
  }
}

export function authorityToFormState(
  authority: ApprovalAuthorityDto,
): AuthorityFormState {
  return {
    displayName: authority.displayName,
    tier: String(authority.tier),
    priority: String(authority.priority),
    maxTotalExposure: String(authority.maxTotalExposure),
    maxSeverity: String(authority.maxSeverity),
    scopeType: String(authority.scopeType),
    allowNew: authority.allowNew,
    allowRenewal: authority.allowRenewal,
  }
}

export function parsedFormToPayload(
  values: AuthorityFormValues,
): AuthorityLimitsPayload {
  return {
    displayName: values.displayName,
    tier: values.tier,
    priority: values.priority,
    maxTotalExposure: values.maxTotalExposure,
    maxSeverity: values.maxSeverity,
    scopeType: values.scopeType,
    allowNew: values.allowNew,
    allowRenewal: values.allowRenewal,
  }
}
