import { z } from "zod";

/**
 * Zod schemas for runtime API response validation.
 *
 * These schemas validate data at the network boundary — before it enters
 * the React tree. This is critical for banking apps because:
 *
 * 1. **Type safety**: TypeScript types are compile-time only. Zod validates
 *    at runtime, catching malformed API responses before they cause crashes.
 *
 * 2. **Security**: Prevents injection of unexpected data shapes that could
 *    bypass client-side checks.
 *
 * 3. **Debugging**: When the backend returns unexpected data, Zod throws
 *    a descriptive error with the exact path that failed validation.
 *
 * Usage:
 * ```typescript
 * import { ApiResponseSchema, LoanResponseSchema } from "@/src/lib/schemas";
 *
 * const response = ApiResponseSchema(LoanResponseSchema).parse(rawData);
 * ```
 */

// ─── Base Schemas ──────────────────────────────────────────────────────────

/**
 * Standard API response envelope.
 * Mirrors `ApiResponse<T>` from the backend.
 */
export function ApiResponseSchema<T extends z.ZodType>(dataSchema: T) {
    return z.object({
        success: z.boolean(),
        message: z.string(),
        data: dataSchema.nullable(),
        errors: z.array(z.string()),
        timestamp: z.string(),
    });
}

/**
 * Paged result wrapper.
 * Mirrors `PagedResult<T>` from the backend.
 */
export function PagedResultSchema<T extends z.ZodType>(itemSchema: T) {
    return z.object({
        items: z.array(itemSchema),
        currentPage: z.number(),
        pageSize: z.number(),
        totalCount: z.number(),
        totalPages: z.number(),
        hasPreviousPage: z.boolean(),
        hasNextPage: z.boolean(),
    });
}

// ─── Auth Schemas ──────────────────────────────────────────────────────────

/**
 * Login response schema.
 */
export const LoginResponseSchema = z.object({
    accessToken: z.string(),
});

/**
 * Refresh response schema.
 */
export const RefreshResponseSchema = z.object({
    accessToken: z.string(),
});

// ─── User Schemas ──────────────────────────────────────────────────────────

/**
 * Approval authority info embedded in user responses.
 */
export const ApprovalAuthorityInfoSchema = z.object({
    key: z.string(),
    displayName: z.string(),
    tier: z.number(),
    priority: z.number(),
    maxTotalExposure: z.number(),
});

/**
 * User response schema.
 * Mirrors `UserResponse` from the backend.
 */
export const UserResponseSchema = z.object({
    id: z.number(),
    username: z.string(),
    firstName: z.string(),
    middleName: z.string().nullable(),
    lastName: z.string(),
    branchId: z.string(),
    role: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    jobTitle: z.string().nullable().optional(),
    eSignature: z.string().nullable().optional(),
    approvalAuthority: ApprovalAuthorityInfoSchema.nullable().optional(),
    coveredBranches: z.array(z.string()).nullable().optional(),
});

/**
 * User audit log response schema.
 */
export const UserAuditLogResponseSchema = z.object({
    id: z.number(),
    action: z.string(),
    entityType: z.string(),
    entityLabel: z.string(),
    summary: z.string(),
    timestamp: z.string(),
    ipAddress: z.string().nullable(),
});

/**
 * Reset password response schema.
 */
export const ResetPasswordResponseSchema = z.object({
    username: z.string(),
    temporaryPassword: z.string(),
    mustChangePassword: z.boolean(),
});

/**
 * User import result schema.
 */
export const UserImportResultSchema = z.object({
    totalRows: z.number(),
    successfulImports: z.number(),
    failedImports: z.number(),
    errors: z.array(z.object({
        rowNumber: z.number(),
        field: z.string(),
        error: z.string(),
    })),
    createdUsernames: z.array(z.string()),
});

// ─── Role Schemas ──────────────────────────────────────────────────────────

/**
 * Role info schema.
 */
export const RoleInfoSchema = z.object({
    name: z.string(),
    displayName: z.string(),
});

/**
 * Role matrix entry schema.
 */
export const RoleMatrixEntrySchema = z.object({
    role: z.string(),
    displayName: z.string(),
    permissions: z.array(z.string()),
});

// ─── Branch Schemas ────────────────────────────────────────────────────────

/**
 * Branch list response schema.
 */
export const BranchListResponseSchema = z.object({
    id: z.number(),
    code: z.string(),
    name: z.string(),
    isActive: z.boolean(),
});

/**
 * Branch response schema.
 */
export const BranchResponseSchema = z.object({
    id: z.number(),
    code: z.string(),
    name: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
});

// ─── Loan Schemas ──────────────────────────────────────────────────────────

/**
 * Loan action response schema.
 */
export const LoanActionResponseSchema = z.object({
    id: z.number(),
    action: z.string(),
    fromStatus: z.string().optional(),
    toStatus: z.string().optional(),
    comments: z.string().optional(),
    actionDate: z.string(),
    actionByUserName: z.string(),
});

/**
 * Outstanding loan response schema.
 */
export const OutstandingLoanResponseSchema = z.object({
    id: z.number(),
    pn: z.string(),
    principalBalance: z.number(),
    amortization: z.number(),
    outstandingBalance: z.number(),
    dateGranted: z.string().optional(),
    dateMaturity: z.string().optional(),
    status: z.string(),
    productWithDescription: z.string().optional(),
});

/**
 * Buy-out response schema.
 */
export const BuyOutResponseSchema = z.object({
    id: z.number(),
    pn: z.string(),
    name: z.string(),
    amortization: z.number(),
    outstandingBalance: z.number(),
});

/**
 * EBI reloan response schema.
 */
export const EbiReloanResponseSchema = z.object({
    id: z.number(),
    pn: z.string(),
    name: z.string(),
    existingDeduction: z.number(),
    outstandingBalance: z.number(),
    payToClose: z.number(),
});

/**
 * Incoming loan response schema.
 */
export const IncomingLoanResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    deductions: z.number(),
    remarks: z.string(),
});

/**
 * Full loan detail response schema.
 * Mirrors `LoanResponse` from the backend.
 */
export const LoanResponseSchema = z.object({
    id: z.number(),
    lamId: z.string(),
    applicationGroupNo: z.string(),
    branchCode: z.string(),
    loanNo: z.string(),
    productCode: z.string(),
    product: z.string(),
    creationTypeCode: z.number().optional(),
    creationTypeLabel: z.string().optional(),
    requestingOfficer: z.string().optional(),
    lai: z.string().optional(),
    cisId: z.string().optional(),
    firstName: z.string(),
    middleName: z.string().optional(),
    lastName: z.string(),
    suffix: z.string().optional(),
    birthdate: z.string().optional(),
    address: z.string().optional(),
    agency: z.string().optional(),
    position: z.string().optional(),
    employeeId: z.string().optional(),
    netTakeHomePay: z.number().optional(),
    lengthOfService: z.string().optional(),
    region: z.string().optional(),
    divisionCode: z.string().optional(),
    stationCode: z.string().optional(),
    misAgency: z.string().optional(),
    school: z.string().optional(),
    referrer: z.string().optional(),
    purpose: z.string().optional(),
    proposedAmount: z.number(),
    termDays: z.number(),
    interestRate: z.number(),
    nthpDate: z.string().optional(),
    notarialFee: z.number(),
    docStamps: z.number(),
    insurance: z.number(),
    standardNotarialFee: z.number(),
    standardDocStamps: z.number(),
    standardInsurance: z.number(),
    verificationFindings: z.string().optional(),
    hasDeviations: z.boolean(),
    deviationDetails: z.array(z.string()),
    deviationJustifications: z.record(z.string()),
    remarks: z.string().optional(),
    aoRecommendation: z.string().optional(),
    otherRemarks: z.string().optional(),
    feeDeviationJustification: z.string().optional(),
    status: z.string(),
    applicationDate: z.string(),
    lastActionDate: z.string(),
    createdById: z.number(),
    createdByName: z.string(),
    actions: z.array(LoanActionResponseSchema),
    outstandingLoans: z.array(OutstandingLoanResponseSchema),
    buyOuts: z.array(BuyOutResponseSchema),
    ebiReloans: z.array(EbiReloanResponseSchema),
    incomingLoans: z.array(IncomingLoanResponseSchema),
});

/**
 * Created loan summary schema.
 */
export const CreatedLoanSummarySchema = z.object({
    id: z.number(),
    lamId: z.string(),
    loanNo: z.string(),
    productCode: z.string(),
    proposedAmount: z.number(),
    status: z.string(),
    branchCode: z.string().nullable().optional(),
    product: z.string().nullable().optional(),
    creationTypeCode: z.number().nullable().optional(),
    creationTypeLabel: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    middleName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    suffix: z.string().nullable().optional(),
    applicationDate: z.string().nullable().optional(),
    lastActionDate: z.string().nullable().optional(),
    createdByName: z.string().nullable().optional(),
    lastActionByName: z.string().nullable().optional(),
    lastAction: z.string().nullable().optional(),
    createdById: z.number().nullable().optional(),
    documentsComplete: z.boolean().nullable().optional(),
    documentsCompleteAt: z.string().nullable().optional(),
    assignedApproverName: z.string().nullable().optional(),
    requiredApprovalTier: z.number().nullable().optional(),
    assignedApproverId: z.number().nullable().optional(),
    queueStage: z.string().nullable().optional(),
    queuePosition: z.number().nullable().optional(),
    queueLength: z.number().nullable().optional(),
    queueOwnerName: z.string().nullable().optional(),
    isQueueHead: z.boolean().optional(),
});

/**
 * Loan submission response schema.
 */
export const LoanSubmissionResponseSchema = z.object({
    applicationGroupNo: z.string(),
    loans: z.array(CreatedLoanSummarySchema),
});

/**
 * Loan history entry schema.
 */
export const LoanHistoryEntrySchema = z.object({
    id: z.number(),
    actionBy: z.string(),
    action: z.string(),
    fromStatus: z.string().optional(),
    toStatus: z.string().optional(),
    comments: z.string().optional(),
    actionDate: z.string(),
    actionByRole: z.string(),
});

// ─── WebLoan Schemas ───────────────────────────────────────────────────────

/**
 * WebLoan account schema.
 */
export const WebLoanAccountSchema = z.object({
    bankCode: z.string(),
    branchCode: z.string(),
    accountNo: z.string(),
    accountId: z.string(),
    name: z.string().nullable(),
    creditLimit: z.number().nullable(),
    usedCredit: z.number().nullable(),
    borrowerType: z.string().nullable(),
});

/**
 * WebLoan borrower schema.
 */
export const WebLoanBorrowerSchema = z.object({
    cisNo: z.string(),
    firstName: z.string(),
    middleName: z.string().nullable(),
    lastName: z.string(),
    title: z.string().nullable(),
    appelation: z.string().nullable(),
    birthDate: z.string().nullable(),
    address: z.string().nullable(),
    agencyType: z.string().nullable(),
    positionTitle: z.string().nullable(),
    region: z.string().nullable(),
    regionCode: z.string().nullable(),
    divisionCode: z.string().nullable(),
    stationCode: z.string().nullable(),
    employeeNumber: z.string().nullable(),
    misAgency: z.string().nullable(),
    requestingOfficer: z.string().nullable(),
    lengthOfService: z.string().nullable(),
});

/**
 * CIS search response schema.
 */
export const WebLoanCisSearchResponseSchema = z.object({
    borrower: WebLoanBorrowerSchema,
    accounts: z.array(WebLoanAccountSchema),
});

/**
 * Active loan schema.
 */
export const ActiveLoanSchema = z.object({
    loanNo: z.string(),
    principal: z.number().nullable(),
    principalBalance: z.number().nullable(),
    dateGranted: z.string().nullable(),
    dateMaturity: z.string().nullable(),
    loanProduct: z.string().nullable(),
    loanProductDescription: z.string().nullable(),
    statusCode: z.number().nullable(),
    statusDescription: z.string().nullable(),
    productStatus: z.string().nullable(),
});

/**
 * Active loans response schema.
 */
export const ActiveLoansResponseSchema = z.object({
    accountNo: z.string(),
    cisNo: z.string(),
    loans: z.array(ActiveLoanSchema),
});

/**
 * Outstanding loan schema.
 */
export const OutstandingLoanSchema = z.object({
    loanNo: z.string().nullable(),
    principal: z.number().nullable(),
    principalBalance: z.number().nullable(),
    amortAmount: z.number().nullable(),
    dateGranted: z.string().nullable(),
    dateMaturity: z.string().nullable(),
    productCode: z.string(),
    productStatus: z.string(),
    productWithDescription: z.string(),
});

/**
 * Outstanding loans response schema.
 */
export const OutstandingLoansResponseSchema = z.object({
    cisNo: z.string(),
    accountId: z.string(),
    branchCode: z.string(),
    accountNo: z.string(),
    loans: z.array(OutstandingLoanSchema),
});

/**
 * Pending loan schema.
 */
export const PendingLoanSchema = z.object({
    loanNo: z.string(),
    principal: z.number().nullable(),
    grantedRate: z.number().nullable(),
    totalTermDays: z.number().nullable(),
    policyTermMonths: z.number().nullable(),
    productWithDescription: z.string(),
    loanPurpose: z.string().nullable(),
    creationType: z.number().nullable(),
    creationTypeLabel: z.string(),
});

/**
 * Pending loan response schema.
 */
export const PendingLoanResponseSchema = z.object({
    cisNo: z.string(),
    accountId: z.string(),
    branchCode: z.string(),
    accountNo: z.string(),
    loans: z.array(PendingLoanSchema),
    nthp: z.string().nullable(),
    nthpDate: z.string().nullable(),
});

/**
 * Cat loan class response schema.
 */
export const CatLoanClassResponseSchema = z.object({
    bch: z.string(),
    loanNo: z.string(),
    loanProduct: z.string(),
    catLoanClass: z.string().nullable(),
});

// ─── Loan Product Schemas ──────────────────────────────────────────────────

/**
 * Loan product response schema.
 */
export const LoanProductResponseSchema = z.object({
    code: z.string(),
    description: z.string(),
    minAmount: z.number(),
    maxAmount: z.number(),
    minTermDays: z.number(),
    maxTermDays: z.number(),
    notarialFee: z.number(),
    docStampFee: z.number(),
    insuranceFee: z.number(),
    advanceInterestRate: z.number(),
    isRetired: z.boolean(),
    lastSyncedAt: z.string(),
});

/**
 * Loan product sync result schema.
 */
export const LoanProductSyncResultSchema = z.object({
    added: z.number(),
    updated: z.number(),
    preserved: z.number(),
    syncedAt: z.string(),
});

/**
 * Loan product import result schema.
 */
export const LoanProductImportResultSchema = z.object({
    totalRows: z.number(),
    created: z.number(),
    updated: z.number(),
    failed: z.number(),
    errors: z.array(z.object({
        rowNumber: z.number(),
        field: z.string(),
        error: z.string(),
    })),
});

// ─── Audit Log Schemas ─────────────────────────────────────────────────────

/**
 * Audit log record schema.
 */
export const AuditLogRecordSchema = z.object({
    id: z.number(),
    timestamp: z.string(),
    userId: z.number().nullable(),
    userName: z.string(),
    action: z.enum(["Create", "Update", "StatusChange", "Login", "Logout", "Delete"]),
    entityType: z.string(),
    entityId: z.string(),
    entityLabel: z.string(),
    summary: z.string(),
    rawChanges: z.string().nullable(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
});

// ─── Dashboard Schemas ─────────────────────────────────────────────────────

/**
 * Dashboard summary schema.
 */
export const DashboardSummarySchema = z.object({
    totalApplications: z.number(),
    pendingApproval: z.number(),
    approvedToday: z.number(),
    rejectedToday: z.number(),
    averageProcessingDays: z.number(),
    totalLoanAmount: z.number(),
});

/**
 * Dashboard data schema.
 */
export const DashboardDataSchema = z.object({
    summary: DashboardSummarySchema,
    pendingQueue: z.array(z.unknown()),
    nowServing: z.array(z.unknown()),
    weeklyTrend: z.array(z.unknown()),
    pushBacks: z.array(z.unknown()),
    approvedLoans: z.array(z.unknown()),
});

// ─── Notification Schemas ──────────────────────────────────────────────────

/**
 * Notification schema.
 */
export const NotificationSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string(),
    createdAt: z.string(),
    read: z.boolean(),
    link: z.string().optional(),
    pendingAction: z.enum(["approve", "decline"]).optional(),
    resolved: z.enum(["approved", "declined"]).optional(),
});

// ─── PreLoan Schemas ───────────────────────────────────────────────────────

/**
 * PreLoan item schema.
 */
export const PreLoanItemSchema = z.object({
    id: z.number(),
    cisNo: z.string(),
    accountNo: z.string(),
    bch: z.string(),
    branchName: z.string(),
    formNumber: z.string().nullable().optional(),
    productCode: z.string().nullable().optional(),
    productDescription: z.string().nullable().optional(),
    proposedAmount: z.number().nullable().optional(),
    termDays: z.number().nullable().optional(),
    interestRate: z.number().nullable().optional(),
    purpose: z.string().nullable().optional(),
    lastModifiedAt: z.string(),
    lastModifiedBy: z.string().nullable().optional(),
});

/**
 * PreLoans response schema.
 */
export const PreLoansResponseSchema = z.object({
    cisNo: z.string().nullable(),
    accountNo: z.string().nullable(),
    bch: z.string(),
    preLoans: z.array(PreLoanItemSchema),
});

// ─── Workflow Schemas ──────────────────────────────────────────────────────

/**
 * Workflow configuration schema.
 */
export const WorkflowConfigurationSchema = z.object({
    requireRecommendation: z.boolean(),
    requireEvaluation: z.boolean(),
    autoApproveThreshold: z.number().nullable(),
});
