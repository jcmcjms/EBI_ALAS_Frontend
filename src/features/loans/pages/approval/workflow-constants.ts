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
}

const WORKFLOW_ACTION_MAP: Record<string, WorkflowAction> = {
  ForChecking: 'Recommend',
  ForApproval: 'Recommend',
  ForRevision: 'PushBack',
  Approved: 'Approve',
  Rejected: 'Reject',
}

export function deriveWorkflowAction(def: WorkflowButtonDef): WorkflowAction {
  const base = WORKFLOW_ACTION_MAP[def.to]
  if (base === 'Recommend' && def.verdict === 'NotRecommended')
    return 'NotRecommend'
  if (def.from === 'ForApproval' && def.to === 'ForRevision')
    return 'ReturnForRevision'
  return base
}

export const WORKFLOW_ACTIONS: WorkflowButtonDef[] = [
  {
    role: 'Recommender',
    from: 'ForRecommendation',
    to: 'ForChecking',
    label: 'Recommend for Checking',
    kind: 'advance',
    remarksRequired: false,
  },
  {
    role: 'Recommender',
    from: 'ForRecommendation',
    to: 'ForRevision',
    label: 'Push Back to Encoder',
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
    remarksRequired: false,
  },
  {
    role: 'Evaluator',
    from: 'ForChecking',
    to: 'ForApproval',
    label: 'Not Recommended',
    kind: 'advance',
    verdict: 'NotRecommended',
    remarksRequired: true,
    confirm: true,
  },
  {
    role: 'Evaluator',
    from: 'ForChecking',
    to: 'ForRevision',
    label: 'Push Back to Encoder',
    kind: 'return',
    remarksRequired: true,
    confirm: true,
  },

  {
    role: 'Approver',
    from: 'ForApproval',
    to: 'Approved',
    label: 'Approve Loan',
    kind: 'advance',
    remarksRequired: false,
  },
  {
    role: 'Approver',
    from: 'ForApproval',
    to: 'ForRevision',
    label: 'Return to Encoder',
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