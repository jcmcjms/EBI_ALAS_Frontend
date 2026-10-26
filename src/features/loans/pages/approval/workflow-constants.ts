import type { EvaluationVerdict } from '@/src/features/loans/api/loan-review'

export const TERMINAL = [
  'Approved',
  'Rejected',
  'Disbursed',
  'OnGoing',
  'Cancelled',
]

export const MIN_REMARKS = 10

export type WorkflowAction =
  | 'Recommend'
  | 'EvaluateRecommend'
  | 'NotRecommend'
  | 'Approve'
  | 'Reject'
  | 'PushBack'
  | 'ReturnForRevision'

export type WorkflowButtonDef = {
  role: string
  from: string
  to: string
  label: string
  kind: 'advance' | 'return' | 'reject'
  verdict?: EvaluationVerdict
  remarksRequired: boolean
  confirm?: boolean
  /** Captures an immutable signature snapshot server-side. */
  signs?: boolean
}

const WORKFLOW_ACTION_MAP: Record<string, WorkflowAction> = {
  ForChecking: 'Recommend',
  ForApproval: 'Recommend',
  ForRevision: 'PushBack',
  Approved: 'Approve',
  Rejected: 'Reject',
}

export function deriveWorkflowAction(def: WorkflowButtonDef): WorkflowAction {
  if (def.role === 'Evaluator' && def.from === 'ForChecking' && def.to === 'ForApproval')
    return def.verdict === 'NotRecommended' ? 'NotRecommend' : 'EvaluateRecommend'
  const base = WORKFLOW_ACTION_MAP[def.to]
  if (base === 'Recommend' && def.verdict === 'NotRecommended')
    return 'NotRecommend'
  if (def.from === 'ForApproval' && def.to === 'ForRevision')
    return 'ReturnForRevision'
  return base
}

export function confirmTitleFor(def: WorkflowButtonDef): string {
  if (def.verdict === 'NotRecommended') return 'Mark as not recommended?'
  if (def.verdict === 'Recommended') return 'Mark as recommended?'
  if (def.kind === 'reject') return 'Reject this application?'
  if (def.kind === 'return') return 'Send this application back for revision?'
  if (def.to === 'Approved') return 'Approve this loan?'
  if (def.to === 'ForChecking') return 'Recommend for checking?'
  return `${def.label}?`
}

export function confirmDescriptionFor(def: WorkflowButtonDef): string {
  if (def.verdict === 'NotRecommended') {
    return 'The application still goes to the Approver, marked as Not Recommended.'
  }
  if (def.kind === 'reject') {
    return 'The loan will be rejected and the application closed. The encoder will be notified.'
  }
  if (def.kind === 'return') {
    return 'The application goes back to the encoder with your remarks.'
  }
  if (def.to === 'Approved') {
    return 'The loan will be approved. The encoder will be notified.'
  }
  if (def.to === 'ForChecking') {
    return 'The application moves to the Evaluator for checking.'
  }
  return 'The application moves to the Approver.'
}


export function collectRemarksInDialog(def: WorkflowButtonDef): boolean {
  return def.remarksRequired && def.kind !== 'return'
}

export const WORKFLOW_ACTIONS: WorkflowButtonDef[] = [
  {
    role: 'Recommender',
    from: 'ForRecommendation',
    to: 'ForChecking',
    label: 'Recommend for checking',
    kind: 'advance',
    remarksRequired: false,
    confirm: true,
    signs: true,
  },
  {
    role: 'Recommender',
    from: 'ForRecommendation',
    to: 'ForRevision',
    label: 'Push back',
    kind: 'return',
    remarksRequired: true,
    confirm: true,
  },

  {
    role: 'Evaluator',
    from: 'ForChecking',
    to: 'ForApproval',
    label: 'Recommended',
    kind: 'advance',
    verdict: 'Recommended',
    remarksRequired: true,
    confirm: true,
    signs: true,
  },
  {
    role: 'Evaluator',
    from: 'ForChecking',
    to: 'ForApproval',
    label: 'Not recommended',
    kind: 'advance',
    verdict: 'NotRecommended',
    remarksRequired: true,
    confirm: true,
    signs: true,
  },
  {
    role: 'Evaluator',
    from: 'ForChecking',
    to: 'ForRevision',
    label: 'Push back',
    kind: 'return',
    remarksRequired: true,
    confirm: true,
  },

  {
    role: 'Approver',
    from: 'ForApproval',
    to: 'Approved',
    label: 'Approve loan',
    kind: 'advance',
    remarksRequired: false,
    confirm: true,
    signs: true,
  },
  {
    role: 'Approver',
    from: 'ForApproval',
    to: 'ForRevision',
    label: 'Return to encoder',
    kind: 'return',
    remarksRequired: true,
    confirm: true,
  },
  {
    role: 'Approver',
    from: 'ForApproval',
    to: 'Rejected',
    label: 'Reject',
    kind: 'reject',
    remarksRequired: true,
    confirm: true,
  },
]