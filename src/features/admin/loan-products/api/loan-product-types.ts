export interface UpdateLoanProductPayload {
  minAmount: number
  maxAmount: number
  minTermDays: number
  maxTermDays: number
  notarialFee: number
  docStampFee: number
  insuranceFee: number
  advanceInterestRate: number
}

export interface LoanProductSyncResult {
  added: number
  updated: number
  preserved: number
  syncedAt: string
}

export interface LoanProductsQuery {
  isActive?: boolean
  code?: string
}

export interface LoanProductImportValidationError {
  rowNumber: number
  field: string
  error: string
}

export interface LoanProductImportResult {
  totalRows: number
  created: number
  updated: number
  failed: number
  errors: LoanProductImportValidationError[]
}
