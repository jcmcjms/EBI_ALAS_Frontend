export interface UserQueryParams {
  search?: string
  role?: string
  branchId?: string
  isActive?: boolean
  pageNumber?: number
  pageSize?: number
}

export interface CreateUserPayload {
  username: string
  password: string
  firstName: string
  middleName?: string | null
  lastName: string
  branchId: string
  role: string

  jobTitle?: string | null

  eSignature?: string | null

  coveredBranches?: string[] | null
}

export interface UpdateUserPayload {
  firstName: string
  middleName?: string | null
  lastName: string
  branchId: string
  role: string
  jobTitle?: string | null
  eSignature?: string | null

  coveredBranches?: string[] | null
}

export interface UserStatusPayload {
  isActive: boolean
}

export interface ResetPasswordResponse {
  username: string
  temporaryPassword: string
  mustChangePassword: boolean
}

export interface ApprovalAuthorityInfo {
  key: string
  displayName: string
  tier: number
  priority: number
  maxTotalExposure: number
}

export interface UserResponse {
  id: number
  username: string
  firstName: string
  middleName: string | null
  lastName: string
  branchId: string
  role: string
  isActive: boolean
  createdAt: string

  jobTitle?: string | null

  eSignature?: string | null

  approvalAuthority?: ApprovalAuthorityInfo | null

  coveredBranches?: string[] | null
}

export interface UserAuditLogResponse {
  id: number
  action: string
  entityType: string
  entityLabel: string
  summary: string
  timestamp: string
  ipAddress: string | null
}

export interface UserImportValidationError {
  rowNumber: number
  field: string
  error: string
}

export interface UserImportResult {
  totalRows: number
  successfulImports: number
  failedImports: number
  errors: UserImportValidationError[]
  createdUsernames: string[]
}

export interface RoleInfo {
  name: string
  displayName: string
}

export interface RoleMatrixEntry {
  role: string
  displayName: string
  permissions: string[]
}
