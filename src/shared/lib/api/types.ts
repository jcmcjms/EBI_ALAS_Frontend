export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
  errors: string[]
  timestamp: string
}

export interface PagedResult<T> {
  items: T[]
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export function unwrapApiData<T>(body: ApiResponse<T>): T {
  if (!body.success || body.data === null) {
    throw new Error(body.message || 'Request failed')
  }
  return body.data
}

export const PERMISSIONS = {
  loansCreate: 'loans.create',
  loansView: 'loans.view',
  loansRecommend: 'loans.recommend',
  loansEvaluate: 'loans.evaluate',
  loansApprove: 'loans.approve',
  loansReject: 'loans.reject',
  loanProductManage: 'loan_product.manage',
  loanProductView: 'loan_product.view',
  userCreate: 'user.create',
  userView: 'user.view',
  userEdit: 'user.edit',
  userSuspend: 'user.suspend',
  roleManage: 'role.manage',
  roleView: 'role.view',
  auditLogsView: 'auditLogs.view',
  workflowManage: 'workflow.manage',
} as const

export const BRANCHES: ReadonlyArray<{ code: string; name: string }> = [
  { code: '000', name: 'Lianga Branch' },
  { code: '002', name: 'Barobo Branch' },
  { code: '003', name: 'San Francisco Branch' },
  { code: '004', name: 'Arasasan Branch' },
  { code: '005', name: 'Hinatuan Branch' },
  { code: '006', name: 'Tagum Branch' },
  { code: '007', name: 'Tandag Branch' },
  { code: '008', name: 'Butuan Branch' },
  { code: '009', name: 'Bislig Branch' },
  { code: '011', name: 'Head Office Branch' },
  { code: '012', name: 'Cagayan Branch' },
  { code: '013', name: 'Talisay Branch' },
  { code: '014', name: 'General Santos Branch' },
  { code: '015', name: 'Panabo Branch' },
  { code: '016', name: 'Valencia Branch' },
  { code: '017', name: 'Cateel Branch' },
  { code: '018', name: 'Davao-Buhangin Branch' },
  { code: '019', name: 'Tacloban Branch' },
  { code: '020', name: 'Bacolod Branch' },
  { code: '021', name: 'Iloilo Branch' },
  { code: '022', name: 'Davao-Matina Branch' },
  { code: '023', name: 'Trento Branch' },
  { code: '024', name: 'Mati Branch' },
  { code: '025', name: 'Bayugan Branch' },
  { code: '026', name: 'Nabunturan Branch' },
  { code: '027', name: 'Madrid Branch' },
  { code: '028', name: 'Surigao Branch' },
  { code: '029', name: 'Gingoog Branch' },
  { code: '030', name: 'CTS (Mandaue) Branch' },
  { code: '031', name: 'Ronda Branch' },
  { code: '991', name: 'Corporate Center' },
] as const

export interface BranchListResponse {
  id: number
  code: string
  name: string
  isActive: boolean
}

export interface BranchResponse {
  id: number
  code: string
  name: string
  isActive: boolean
  createdAt: string
}

export interface BranchQueryParams {
  pageNumber?: number
  pageSize?: number
  isActive?: boolean
}

export interface BranchesPagedResult {
  items: BranchListResponse[]
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface LoanProductResponse {
  code: string

  description: string

  minAmount: number

  maxAmount: number

  minTermDays: number

  maxTermDays: number

  notarialFee: number

  docStampFee: number

  insuranceFee: number

  advanceInterestRate: number

  applicationChargeRate: number

  amortizationMode: string

  chargeAdvanceInterest: boolean

  isRetired: boolean

  lastSyncedAt: string
}

// ── Loan Status ────────────────────────────────────────────────────

export type LoanStatus =
  | 'Draft'
  | 'ForRecommendation'
  | 'ForChecking'
  | 'ForApproval'
  | 'ForRevision'
  | 'Approved'
  | 'ForDisbursement'
  | 'Disbursed'
  | 'OnGoing'
  | 'Rejected'
  | 'Cancelled'

export interface LoanStatusMeta {
  label: string

  className: string

  defaultSlaHours: number | null

  hint: string
}

const loanStatusColors = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400',
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
  red: 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400',
  grey: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400',
} as const

export const LOAN_STATUS_META: Record<LoanStatus, LoanStatusMeta> = {
  Draft: {
    label: 'Draft',
    defaultSlaHours: null,
    hint: 'Encoded, not yet submitted',
    className: loanStatusColors.grey,
  },
  ForRecommendation: {
    label: 'For Recommendation',
    defaultSlaHours: 4,
    hint: 'With the Branch Head (Recommender)',
    className: loanStatusColors.blue,
  },
  ForChecking: {
    label: 'For Checking',
    defaultSlaHours: 8,
    hint: 'With the Credit Checker (Evaluator)',
    className: loanStatusColors.blue,
  },
  ForApproval: {
    label: 'For Approval',
    defaultSlaHours: 8,
    hint: 'With the Area Head (Approver)',
    className: loanStatusColors.blue,
  },
  ForRevision: {
    label: 'For Revision',
    defaultSlaHours: 24,
    hint: 'Returned to the Encoder for fixes',
    className: loanStatusColors.blue,
  },
  Approved: {
    label: 'Approved',
    defaultSlaHours: null,
    hint: 'Approved — awaiting disbursement setup',
    className: loanStatusColors.green,
  },
  ForDisbursement: {
    label: 'For Disbursement',
    defaultSlaHours: 24,
    hint: 'Release of proceeds in progress',
    className: loanStatusColors.blue,
  },
  Disbursed: {
    label: 'Disbursed',
    defaultSlaHours: null,
    hint: 'Proceeds released',
    className: loanStatusColors.green,
  },
  OnGoing: {
    label: 'On Going',
    defaultSlaHours: null,
    hint: 'Active receiving loan',
    className: loanStatusColors.green,
  },
  Rejected: {
    label: 'Rejected',
    defaultSlaHours: null,
    hint: 'Declined — terminal',
    className: loanStatusColors.red,
  },
  Cancelled: {
    label: 'Cancelled',
    defaultSlaHours: null,
    hint: 'Client withdrew — terminal',
    className: loanStatusColors.grey + ' line-through',
  },
}

export const STATUS_FILTER_ORDER: LoanStatus[] = [
  'ForRecommendation',
  'ForChecking',
  'ForApproval',
  'ForRevision',
  'ForDisbursement',
  'Draft',
  'OnGoing',
  'Approved',
  'Disbursed',
  'Rejected',
  'Cancelled',
]
