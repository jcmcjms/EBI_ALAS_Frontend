import type { EvaluationVerdict } from '@/src/features/loans/api/loan-review'

export const TERMINAL = [
  'Approved',
  'Rejected',
  'Disbursed',
  'OnGoing',
  'Cancelled',
]

/** Mirrors MinRecommendRemarksLength in LoanWorkflowService. */
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
  if (def.verdict === 'Recommended') return 'Recommend for approval?'
  if (def.kind === 'reject') return 'Reject this application?'
  if (def.kind === 'return') return 'Push back to the encoder?'
  if (def.to === 'Approved') return 'Approve this loan?'
  if (def.to === 'ForChecking') return 'Recommend for checking?'
  return `${def.label}?`
}

/**
 * One line, the consequence the reviewer is accountable for. Every statement
 * here is checked against LoanWorkflowService: reject notifies the actor only,
 * approve and push back notify the encoder, and a not-recommended evaluation
 * still advances to ForApproval.
 */
export function confirmDescriptionFor(def: WorkflowButtonDef): string {
  if (def.verdict === 'NotRecommended') {
    return 'The application still goes to the Approver, who makes the final call.'
  }
  if (def.verdict === 'Recommended') {
    return 'Goes to the Approver with your remarks.'
  }
  if (def.kind === 'reject') {
    return 'This ends the application. It cannot be reopened.'
  }
  if (def.kind === 'return') {
    return 'Leaves your queue until the encoder resubmits.'
  }
  if (def.to === 'Approved') {
    return 'The loan is approved and the encoder is notified.'
  }
  if (def.to === 'ForChecking') {
    return 'Goes to the Evaluator for checking.'
  }
  return 'Goes to the Approver.'
}

/** The verb shown on the dialog's confirm button. */
export function confirmActionLabelFor(def: WorkflowButtonDef): string {
  if (def.verdict === 'NotRecommended') return 'Mark not recommended'
  if (def.verdict === 'Recommended') return 'Recommend'
  if (def.kind === 'reject') return 'Reject application'
  if (def.kind === 'return') return 'Push back'
  if (def.to === 'Approved') return 'Approve loan'
  return def.label
}

/**
 * Why the remarks field is required, in the reviewer's terms rather than as a
 * character count. Null when remarks are optional.
 */
export function remarksPurposeFor(def: WorkflowButtonDef): string | null {
  if (!def.remarksRequired) return null
  if (def.verdict === 'NotRecommended')
    return 'The Approver reads this before deciding.'
  if (def.kind === 'reject') return 'Recorded in the application history.'
  if (def.kind === 'return') return 'The encoder reads this to fix the file.'
  return 'The Approver reads this before deciding.'
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
    label: 'Recommend for approval',
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
    label: 'Do not recommend',
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
    label: 'Push back',
    kind: 'return',
    remarksRequired: true,
    confirm: true,
  },
  {
    role: 'Approver',
    from: 'ForApproval',
    to: 'Rejected',
    label: 'Reject application',
    kind: 'reject',
    remarksRequired: true,
    confirm: true,
  },
]