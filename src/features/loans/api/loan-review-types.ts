import type { LoanStatus } from '@/src/features/loans/utils/loan-status'

export type EvaluationVerdict = 'Recommended' | 'NotRecommended'

export interface LoanDetailResponse {
  id: number
  lamId: string
  applicationGroupNo: string
  branchCode: string
  loanNo: string
  productCode: string
  product: string
  creationTypeCode: number | null
  creationTypeLabel: string | null
  requestingOfficer: string | null
  lai: string | null
  cisId: string | null
  firstName: string
  middleName: string | null
  lastName: string
  suffix: string | null
  birthdate: string | null
  address: string | null
  agency: string | null
  position: string | null
  employeeId: string | null
  netTakeHomePay: number | null
  lengthOfService: string | null
  region: string | null
  divisionCode: string | null
  stationCode: string | null
  misAgency: string | null
  school: string | null
  referrer: string | null
  purpose: string | null
  proposedAmount: number
  termDays: number
  interestRate: number
  policyTermMonths: number | null
  approvalTermDays: number | null
  annualRatePercent: number | null
  cDocStamp: number | null
  nthpDate: string | null
  notarialFee: number
  docStamps: number
  insurance: number
  standardNotarialFee: number
  standardDocStamps: number
  standardInsurance: number
  verificationFindings: string | null
  hasDeviations: boolean
  deviationDetails: string[]
  deviationJustifications: Record<string, string>
  remarks: string | null
  aoRecommendation: string | null
  otherRemarks: string | null
  feeDeviationJustification: string | null
  status: string
  applicationDate: string
  lastActionDate: string
  createdById: number
  createdByName: string
  actions: {
    id: number
    action: string
    fromStatus: string | null
    toStatus: string | null
    comments: string | null
    actionDate: string
    actionByUserName: string
  }[]
  evaluationVerdict: string | null
  documentFlag: {
    flaggedAt: string
    flaggedById: number | null
    reason: string | null
    missingCount: number
  } | null
  outstandingLoans: {
    id: number
    pn: string
    principalBalance: number
    amortization: number
    outstandingBalance: number
    dateGranted: string | null
    dateMaturity: string | null
    status: string
    productWithDescription: string | null
  }[]
  buyOuts: {
    id: number
    pn: string
    name: string
    amortization: number
    outstandingBalance: number
  }[]
  ebiReloans: {
    id: number
    pn: string
    name: string
    existingDeduction: number
    outstandingBalance: number
    payToClose: number
  }[]
  incomingLoans: {
    id: number
    name: string
    deductions: number
    remarks: string
  }[]
  preLoanId: number | null
  preLoanFormNumber: string | null
  webLoanPnNumbers: string[]
  documentsComplete: boolean | null
  documentsCompleteAt: string | null
  assignedApproverName: string | null
  requiredApprovalTier: number | null
  assignedApproverId: number | null
}

export interface LoanAttachmentDto {
  id: number
  fileName: string
  contentType: string
  sizeBytes: number
  category: string | null
  uploadedById: number
  uploadedByName: string
  uploadedAt: string
}

export interface LoanChecklistDocumentDto {
  loanNo: string
  loanProduct: string
  idCode: string
  checklistDescription: string | null
  docId: number | null
  docStr: string | null
  miniStr: string | null
  contentType: string | null
  created: string | null
  uploadedBy: string | null
  uploadStatus: string
}

export interface ChecklistDocument {
  code: string
  description: string
  isUploaded: boolean
  uploadedAt: string | null
}

export interface DeviationRemarkDto {
  id: number
  loanDeviationId: number
  parentRemarkId: number | null
  authorName: string
  authorRole: string
  body: string
  createdAt: string
}

export interface LoanDeviationDto {
  id: number
  reasonText: string
  encoderJustification: string
  isFeeOverride: boolean
  sortOrder: number
  remarks: DeviationRemarkDto[]
}

export interface DocumentRemarkDto {
  id: number
  loanApplicationId: number
  checklistIdCode: string
  docId: number | null
  parentRemarkId: number | null
  authorId: number
  authorName: string
  authorRole: string
  body: string
  createdAt: string
}

export interface DocumentChecklistItem {
  id: number
  loanApplicationId: number
  code: string
  name: string
  status: string
  docId: number | null
  updatedAtUtc: string
}

export interface SlaPolicy {
  ForRecommendation: number
  ForChecking: number
  ForApproval: number
}

export interface RoutingEvaluatedInputs {
  cycle: string
  severity: string
  exposure: number
}

export interface LoanRoutingResponse {
  loanId: number
  requiredApprovalTier: number | null
  deviationSeverity: number
  totalExposure: number
  loanType: string
  matchedRule: string | null
  documentsComplete: boolean
  missingDocuments: string[]
  assignedApproverId: number | null
  assignedApproverName: string | null
  escalatedFromTier: number | null
  noAuthorityReason: string | null
  evaluated: RoutingEvaluatedInputs | null
}

export interface TimelineEvent {
  id: string
  type:
    | 'workflow'
    | 'deviation'
    | 'deviationRemark'
    | 'documentRemark'
    | 'remark'
  occurredAtUtc: string
  actorName: string | null
  actorRole: string | null
  action: string | null
  fromStatus: string | null
  toStatus: string | null
  comment: string | null
  subject: string | null
  subjectCode: string | null
}

export interface SyncDisbursementResult {
  loanId: number
  lamId: string
  loanNo: string
  previousStatus?: string
  currentStatus: string
  synced: boolean
  reason: string
}

export type WorkflowAction =
  | 'Recommend'
  | 'NotRecommend'
  | 'PushBack'
  | 'Approve'
  | 'Reject'
  | 'ReturnForRevision'

export type UpdateStatusPayload =
  | { action: WorkflowAction; comments: string }
  | { status: LoanStatus; comments: string }

export const CANCELLABLE_STATUSES: LoanStatus[] = [
  'Draft',
  'ForRecommendation',
  'ForChecking',
  'ForApproval',
  'ForRevision',
]