/**
 * Shared API contracts mirroring EBI.ALAS.Api backend models.
 *
 * Source of truth:
 *   - Common/Models/ApiResponse.cs
 *   - Common/Models/PagedResult.cs
 *   - Features/Users/UserDtos.cs
 *   - Features/WebLoans/WebLoanBorrowerResponse.cs
 *   - Common/Constants/{Permissions,Roles}.cs
 */

// ─── Response envelope ───────────────────────────────────────────────────────

/** Standard wrapper returned by every endpoint (ApiResponse<T>). */
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
    errors: string[];
    timestamp: string;
}

/** Generic paged result wrapper (PagedResult<T>). */
export interface PagedResult<T> {
    items: T[];
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

/** Unwraps the ApiResponse envelope; throws when the backend reports failure. */
export function unwrapApiData<T>(body: ApiResponse<T>): T {
    if (!body.success || body.data === null) {
        throw new Error(body.message || "Request failed");
    }
    return body.data;
}

// ─── Users ───────────────────────────────────────────────────────────────────

/** GET /api/users query parameters (UserQueryParameters). */
export interface UserQueryParams {
    search?: string;
    role?: string;
    isActive?: boolean;
    pageNumber?: number;
    pageSize?: number;
}

/** POST /api/users body (CreateUserRequest). */
export interface CreateUserPayload {
    username: string;
    password: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    branchId: string;
    role: string;
}

/** PUT /api/users/{id} body (UpdateUserRequest). */
export interface UpdateUserPayload {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    branchId: string;
    role: string;
}

/** PATCH /api/users/{id}/status body (UserStatusRequest). */
export interface UserStatusPayload {
    isActive: boolean;
}

/** User record returned by all user endpoints (UserResponse). */
export interface UserResponse {
    id: number;
    username: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    branchId: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

/** Audit log record for a specific user (UserAuditLogResponse). */
export interface UserAuditLogResponse {
    id: number;
    action: string;
    entityType: string;
    entityLabel: string;
    summary: string;
    timestamp: string;
    ipAddress: string | null;
}

// ─── Roles & permissions ─────────────────────────────────────────────────────

/** Entry from GET /api/roles ({ name, displayName }). */
export interface RoleInfo {
    name: string;
    displayName: string;
}

/** Entry from GET /api/roles/matrix. Permissions are static — defined in backend code. */
export interface RoleMatrixEntry {
    role: string;
    displayName: string;
    permissions: string[];
}

// ─── Permission constants (mirror Common/Constants/Permissions.cs) ──────────

export const PERMISSIONS = {
    loansCreate: "loans.create",
    loansView: "loans.view",
    loansRecommend: "loans.recommend",
    loansEvaluate: "loans.evaluate",
    loansApprove: "loans.approve",
    loansReject: "loans.reject",
    loanProductManage: "loan_product.manage",
    loanProductView: "loan_product.view",
    userCreate: "user.create",
    userView: "user.view",
    userEdit: "user.edit",
    userSuspend: "user.suspend",
    roleManage: "role.manage",
    roleView: "role.view",
    auditLogsView: "auditLogs.view",
} as const;

/**
 * Static branch list — mirrors the backend Branch entity (Features/Branches).
 * BranchId is stored as a plain string on users (matches Branch.Code).
 * Kept in sync with WEBLOAN_BRANCHES for the WebLoan database.
 */
export const BRANCHES: ReadonlyArray<{ code: string; name: string }> = [
    { code: "000", name: "Lianga Branch" },
    { code: "002", name: "Barobo Branch" },
    { code: "003", name: "San Francisco Branch" },
    { code: "004", name: "Arasasan Branch" },
    { code: "005", name: "Hinatuan Branch" },
    { code: "006", name: "Tagum Branch" },
    { code: "007", name: "Tandag Branch" },
    { code: "008", name: "Butuan Branch" },
    { code: "009", name: "Bislig Branch" },
    { code: "011", name: "Head Office Branch" },
    { code: "012", name: "Cagayan Branch" },
    { code: "013", name: "Talisay Branch" },
    { code: "014", name: "General Santos Branch" },
    { code: "015", name: "Panabo Branch" },
    { code: "016", name: "Valencia Branch" },
    { code: "017", name: "Cateel Branch" },
    { code: "018", name: "Davao-Buhangin Branch" },
    { code: "019", name: "Tacloban Branch" },
    { code: "020", name: "Bacolod Branch" },
    { code: "021", name: "Iloilo Branch" },
    { code: "022", name: "Davao-Matina Branch" },
    { code: "023", name: "Trento Branch" },
    { code: "024", name: "Mati Branch" },
    { code: "025", name: "Bayugan Branch" },
    { code: "026", name: "Nabunturan Branch" },
    { code: "027", name: "Madrid Branch" },
    { code: "028", name: "Surigao Branch" },
    { code: "029", name: "Gingoog Branch" },
    { code: "030", name: "CTS (Mandaue) Branch" },
    { code: "031", name: "Ronda Branch" },
    { code: "991", name: "Corporate Center" },
] as const;

// ─── Branches API ──────────────────────────────────────────────────────────────

/** Branch record returned by GET /api/branches (BranchListResponse). */
export interface BranchListResponse {
    id: number;
    code: string;
    name: string;
    isActive: boolean;
}

/** Branch record returned by GET /api/branches/{id} (BranchResponse). */
export interface BranchResponse {
    id: number;
    code: string;
    name: string;
    isActive: boolean;
    createdAt: string;
}

/** GET /api/branches query parameters. */
export interface BranchQueryParams {
    pageNumber?: number;
    pageSize?: number;
    isActive?: boolean;
}

/** Paged result for branches (ApiResponse<PagedResult<BranchListResponse>>). */
export interface BranchesPagedResult {
    items: BranchListResponse[];
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

/**
 * Static webloan branch list — mirrors dbo.branch_set (bk='088') in the WebLoan
 * database, generated 2026-08-26. `code` = branch code (bch, same format as
 * cis_info.bch); `name` = branch display name.
 *
 * ⚠️ webloan quirk: the NAME lives in the `bch_add` column (`bch_add_full`
 * holds the address, `bch_name` is empty).
 *
 * The frontend cannot query the WebLoan DB directly, so this is a snapshot.
 * If a new branch appears in webloan, add it here — or expose it via the API
 * (join branch_set in WebLoanService) to make this dynamic.
 */
export const WEBLOAN_BRANCHES: ReadonlyArray<{ code: string; name: string }> = [
    { code: "000", name: "Lianga Branch" },
    { code: "002", name: "Barobo Branch" },
    { code: "003", name: "San Francisco Branch" },
    { code: "004", name: "Arasasan Branch" },
    { code: "005", name: "Hinatuan Branch" },
    { code: "006", name: "Tagum Branch" },
    { code: "007", name: "Tandag Branch" },
    { code: "008", name: "Butuan Branch" },
    { code: "009", name: "Bislig Branch" },
    { code: "011", name: "Head Office Branch" },
    { code: "012", name: "Cagayan Branch" },
    { code: "013", name: "Talisay Branch" },
    { code: "014", name: "General Santos Branch" },
    { code: "015", name: "Panabo Branch" },
    { code: "016", name: "Valencia Branch" },
    { code: "017", name: "Cateel Branch" },
    { code: "018", name: "Davao-Buhangin Branch" },
    { code: "019", name: "Tacloban Branch" },
    { code: "020", name: "Bacolod Branch" },
    { code: "021", name: "Iloilo Branch" },
    { code: "022", name: "Davao-Matina Branch" },
    { code: "023", name: "Trento Branch" },
    { code: "024", name: "Mati Branch" },
    { code: "025", name: "Bayugan Branch" },
    { code: "026", name: "Nabunturan Branch" },
    { code: "027", name: "Madrid Branch" },
    { code: "028", name: "Surigao Branch" },
    { code: "029", name: "Gingoog Branch" },
    { code: "030", name: "CTS (Mandaue) Branch" },
    { code: "031", name: "Ronda Branch" },
    { code: "991", name: "Corporate Center" },
];

// ─── WebLoans (CIS lookup) ───────────────────────────────────────────────────

/** Branch & Type section of the CIS lookup response (BranchAndTypeSection). */
export interface WebLoanBranchAndType {
    /** Loan type label of the borrower's most recent active loan (e.g. "Reloan"). */
    type: string | null;
    typeCode: number | null;
    branchCode: string | null;
    /**
     * Requesting officer's full name. Resolved from
     * `loan_acct_info.solicitor` → `mis_group.path` (group_no=2) →
     * `description`. Falls back to null when the borrower's account has no
     * solicitor or the path cannot be resolved.
     */
    requestingOfficer: string | null;
    cisNo: string | null;
    /** Loan Account Info numbers (acct_no) owned by this client. */
    lai: string[];
}

/** Personal Information section — sourced from cis_info (PersonalInformationSection). */
export interface WebLoanPersonalInformation {
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    suffix: string | null;
    birthdate: string | null;
    address: string | null;
    agencyName: string | null;
    agencyTypeCode: number | null;
    /**
     * Agency type description resolved from `cis_info_misc_data` (id_code=14)
     * → `mis_group.id_code` in the agency-type group. e.g. "RPSU".
     * Falls back to null when the borrower has no misc row or the id_code
     * is unknown.
     */
    agencyType: string | null;
    positionTitle: string | null;
    /** Not stored in webloan — always null. Populated in ALAS. */
    lengthOfService: string | null;
    regionCode: string | null;
    divisionCode: string | null;
    stationCode: string | null;
    employeeNo: string | null;
    /**
     * Primary MIS path from `loan_acct_info.cat_mis_group` (e.g. "INDIV/SAL").
     * The resolved agency name (e.g. "DEPED LIANGA") is `misAgencyName`.
     */
    misAgency: string | null;
    /**
     * Resolved secondary MIS agency name from
     * `loan_acct_info.cat_mis_group2` → `mis_group.path` (e.g. "DEPED LIANGA").
     */
    misAgencyName: string | null;
}

/** Optional Information section (OptionalInformationSection) — not stored in webloan yet. */
export interface WebLoanOptionalInformation {
    referrer: string | null;
    school: string | null;
}

/** Loan Information section — borrower's most recent active loan (LoanInformationSection). */
export interface WebLoanLoanInformation {
    productCode: string | null;
    productDescription: string | null;
    termMonths: number | null;
    paymentIntervalMonths: number | null;
    interestRate: number | null;
    purpose: string | null;
    proposedAmount: number | null;
    /** Captured in ALAS at application time; not stored in webloan — always null. */
    nthp: number | null;
    nthpDate: string | null;
}

/** Deviations section (DeviationSection) — assessed within ALAS, always empty here. */
export interface WebLoanDeviation {
    hasDeviations: boolean;
    deviations: string[];
}

/** Outstanding Loans row (OutstandingLoanItem). */
export interface WebLoanOutstandingLoan {
    pn: string;
    accountNo: string | null;
    principalBalance: number | null;
    amortization: number | null;
    outstandingBalance: number | null;
    dateGranted: string | null;
    dateMaturity: string | null;
    status: string | null;
}

/** EBI account considered for reloan (EbiReloanAccountItem). */
export interface WebLoanEbiReloanAccount {
    pn: string;
    name: string | null;
    existingDeductions: number | null;
    payToClose: number | null;
    principalBalance: number | null;
    status: string | null;
}

/** Buy-out accounts from other FIs (BuyOutAccountItem). */
export interface WebLoanBuyOutAccount {
    pn: string;
    name: string | null;
    amortization: number | null;
    outstandingBalance: number | null;
}

/** Incoming/undeducted loans (IncomingLoanItem). */
export interface WebLoanIncomingLoan {
    name: string | null;
    deductions: number | null;
    remarks: string | null;
}

/** Full borrower profile returned by GET /api/webloans/cis/{cisNo} (WebLoanBorrowerResponse). */
export interface WebLoanBorrower {
    branchAndType: WebLoanBranchAndType;
    personalInformation: WebLoanPersonalInformation;
    optionalInformation: WebLoanOptionalInformation;
    loanInformation: WebLoanLoanInformation;
    deviation: WebLoanDeviation;
    outstandingLoans: WebLoanOutstandingLoan[];
    ebiReloanAccounts: WebLoanEbiReloanAccount[];
    buyOutAccounts: WebLoanBuyOutAccount[];
    incomingLoans: WebLoanIncomingLoan[];
}

// ─── Active Loans (CIS + Account) ────────────────────────────────────────────

/**
 * One row from GET /api/webloans/cis/{cisNo}/accounts/{accountNo}/active-loans.
 * Mirrors ActiveLoanItem on the backend. Backed by the reference SQL:
 *   SELECT TOP 10 ... FROM dbo.loan_data
 *    WHERE acct_no + bch='000' + is_loan=1 + loan_status != 10
 *    ORDER BY date_granted DESC.
 */
export interface ActiveLoan {
    /** Promissory Note number (loan_data.loan_no). */
    loanNo: string;
    /** Original principal amount (loan_data.principal). */
    principal: number | null;
    /** Current principal balance (loan_data.principal_bal). */
    principalBalance: number | null;
    /** Date the loan was granted (ISO 8601, date portion). */
    dateGranted: string | null;
    /** Maturity date (ISO 8601, date portion). */
    dateMaturity: string | null;
    /** Loan product code (loan_data.loan_product, e.g. "PL", "MPL"). */
    loanProduct: string | null;
    /** Loan product description resolved from dbo.loan_product. */
    loanProductDescription: string | null;
    /** Raw loan status code (loan_data.loan_status). */
    statusCode: number | null;
    /** Human-readable status label (e.g. "Current", "Pastdue Performing"). */
    statusDescription: string | null;
    /** Pre-joined "<product> - <status>" display string from the backend. */
    productStatus: string | null;
}

/** Response from GET /api/webloans/cis/{cisNo}/accounts/{accountNo}/active-loans. */
export interface ActiveLoansResponse {
    accountNo: string;
    cisNo: string;
    loans: ActiveLoan[];
}

// ─── PreLoans (CIS + Account + bch) ──────────────────────────────────────────

/**
 * One row from GET /api/preloans.
 *
 * A "preloan" is a draft / in-progress loan application that was previously
 * saved against a (CIS, account, bch) triple. When creating a new application
 * the AO picks the existing preloan they want to resume; the backend then
 * hydrates the rest of the form from it.
 *
 * The list is **always pre-filtered** by the backend for the acting officer's
 * `bch` (branch code) — i.e. a user only ever sees preloans whose `bch`
 * matches `user.branchId`. The frontend never filters by branch itself.
 */
export interface PreLoanItem {
    /** Stable preloan id (PK on the preloan table). */
    id: number;
    /** CIS number this preloan belongs to. */
    cisNo: string;
    /** Account number (loan_acct_info.acct_no) this preloan is tied to. */
    accountNo: string;
    /** Branch code (loan_acct_info.bch) — server-asserted to match the JWT user. */
    bch: string;
    /** Human-readable branch name (resolved from dbo.branch_set). */
    branchName: string;
    /** Optional reference form number, if the preloan was already routed through a draft. */
    formNumber?: string | null;
    /** Loan product code / description copied from webloan at preloan time. */
    productCode?: string | null;
    productDescription?: string | null;
    /** Last proposed terms captured in the draft. */
    proposedAmount?: number | null;
    termMonths?: number | null;
    interestRate?: number | null;
    purpose?: string | null;
    /** When the preloan was last edited (ISO 8601). */
    lastModifiedAt: string;
    /** Officer that last edited the preloan (display-only — server re-asserts). */
    lastModifiedBy?: string | null;
}

/** Response wrapper for GET /api/preloans. */
export interface PreLoansResponse {
    /** Echo of the cis filter that produced this list (null when omitted). */
    cisNo: string | null;
    /** Echo of the accountNo filter (null when omitted). */
    accountNo: string | null;
    /** Echo of the bch filter that the server enforced (== acting user's branchId). */
    bch: string;
    preLoans: PreLoanItem[];
}

/** Query parameters for GET /api/preloans. */
export interface PreLoansQuery {
    /** Filter by CIS number. */
    cisNo?: string;
    /** Filter by account number (typically the LAI account selected in the UI). */
    accountNo?: string;
}

// ─── Audit Logs ─────────────────────────────────────────────────────────────────

/** Audit log record returned by GET /api/audit-logs (AuditLogResponse). */
export interface AuditLogRecord {
    id: number;
    timestamp: string;
    userId: number | null;
    userName: string;
    action: "Create" | "Update" | "StatusChange" | "Login" | "Logout" | "Delete";
    entityType: string;
    entityId: string;
    entityLabel: string;
    summary: string;
    rawChanges: string | null;
    ipAddress: string | null;
    userAgent: string | null;
}

/** Query parameters for GET /api/audit-logs. */
export interface AuditLogQueryParams {
    page?: number;
    pageSize?: number;
    search?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
}
