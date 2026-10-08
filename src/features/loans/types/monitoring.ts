import type { LoanStatus } from '@/src/features/loans/model/loan-status'

export type { LoanStatus }

export type QueueStage = 'Recommendation' | 'Evaluation' | 'Approval'

export interface LoanMonitoringRecord {
  id?: number
  formNumber: string
  branchCode: string
  customerName: string
  loanType: string
  product: string
  loanAmount: number
  applicationDate: string
  status: LoanStatus
  lastActionDate: string
  timeLapsedHours: number

  lastActionBy: string

  lastActionVerb: string | null

  createdById?: number | null

  documentsComplete: boolean | null

  documentsCompleteAt: string | null

  assignedApproverName: string | null

  requiredApprovalTier: number | null

  noAuthorityReason: string | null

  queueStage: QueueStage | null

  queuePosition: number | null

  queueLength: number | null

  queueOwnerName: string | null

  isQueueHead: boolean

  documentFlag: {
    flaggedAt: string
    flaggedById: number | null
    reason: string | null
    missingCount: number
  } | null
}

export interface MonitoringFilters {
  search: string
  dateRange: { from: Date | undefined; to: Date | undefined }
  status: LoanStatus[]
  branchCode: string

  myTurn: boolean
}
