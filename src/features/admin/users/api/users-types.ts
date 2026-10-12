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
  email?: string | null
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
  email?: string | null
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
  /** Backend user id (GUID string). */
  id: string
  username: string
  firstName: string
  middleName: string | null
  lastName: string
  branchId: string
  role: string
  isActive: boolean
  createdAt: string
  email?: string | null

  jobTitle?: string | null

  eSignature?: string | null

  approvalAuthority?: ApprovalAuthorityInfo | null

  coveredBranches?: string[] | null
}

export interface UserImportValidationError {
  rowNumber: number
  field: string
  error: string
}

export interface UserImportCredential {
  username: string
  temporaryPassword: string
}

export interface UserImportResult {
  totalRows: number
  successfulImports: number
  failedImports: number
  errors: UserImportValidationError[]
  createdUsernames: string[]
  createdCredentials: UserImportCredential[]
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

/** Raw DTO returned by GET /api/users (no ApiResponse envelope). */
export interface BackendUserDto {
  id: string
  userName: string
  firstName: string
  lastName: string
  middleName: string | null
  email: string | null
  branchId: string
  role: string
  status: string
  mustChangePassword: boolean
  createdAt: string
}

export interface BackendPageResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface BackendRoleCatalogItem {
  role: string
  permissions: string[]
}

export function toUserResponse(dto: BackendUserDto): UserResponse {
  return {
    id: dto.id,
    username: dto.userName,
    firstName: dto.firstName,
    middleName: dto.middleName,
    lastName: dto.lastName,
    branchId: dto.branchId,
    role: dto.role,
    isActive: dto.status.toLowerCase() === 'active',
    createdAt: dto.createdAt,
    email: dto.email,
    jobTitle: null,
    eSignature: null,
    approvalAuthority: null,
    coveredBranches: null,
  }
}
