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
//
// Mirrors `EBI.ALAS.Api.Features.WebLoans.WebLoanDtos.cs` —
// `CisSearchResponse(BorrowerDto, IReadOnlyList<AccountDto>)`. The backend
// returns the search payload as a flat `{ borrower, accounts[] }` envelope;
// nested "sections" (branchAndType / personalInformation / loanInformation /
// ...) were a planned shape that was never implemented on the server side,
// so the frontend MUST treat these two top-level keys as the contract.

/**
 * One account (Loan Account Info / LAI) attached to a CIS.
 *
 * `accountNo` is the bare webloan account number; `accountId` is the
 * combined "<branchCode>-<accountNo>" form (e.g. "011-05-13081-1") that
 * the two drill-down endpoints (outstanding-loans, pending-loan) expect
 * on their route. Use `accountId` when calling those endpoints; use
 * `accountNo` everywhere else (form fields, preloan lookups, etc.).
 *
 * Mirrors `AccountDto` on the backend (Features/WebLoans/WebLoanDtos.cs).
 */
export interface WebLoanAccount {
    bankCode: string;
    branchCode: string;
    accountNo: string;
    /**
     * Combined "<branchCode>-<accountNo>" identifier. Pass this to the
     * `/outstanding-loans` and `/pending-loan` endpoints. The backend
     * splits on the first dash to recover the (bch, acctNo) pair.
     */
    accountId: string;
    name: string | null;
    creditLimit: number | null;
    usedCredit: number | null;
    borrowerType: string | null;
}

/**
 * Borrower section of the CIS search payload. Mirrors `BorrowerDto` on
 * the backend.
 *
 * Fields are nullable because the webloan DB itself is nullable on every
 * one of them — `cis_info.b_*` columns allow nulls and many borrowers
 * simply have no `cis_info_misc_data` row, etc. The frontend must always
 * default missing values to "" / 0 before rendering.
 */
export interface WebLoanBorrower {
    /** CIS number (cis_info.cis_no). */
    cisNo: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    /** Title (Mr/Ms/...) — surfaced but rarely displayed. */
    title: string | null;
    /** Suffix / appelation. */
    appelation: string | null;
    /** ISO 8601 datetime (date portion is the birthday). */
    birthDate: string | null;
    /** Pre-joined address (zip, street, city, province, brgy, village). */
    address: string | null;
    /**
     * Agency-type description resolved from `cis_info_misc_data`
     * (id_code=14) → `mis_group.id_code` in the agency-type group.
     * e.g. "RPSU". Null when the borrower has no misc row or the id_code
     * is unknown.
     */
    agencyType: string | null;
    positionTitle: string | null;
    /** Human-readable region label (e.g. "Region 1", "NCR"). */
    region: string | null;
    regionCode: string | null;
    divisionCode: string | null;
    stationCode: string | null;
    /** Employee number (cis_info.employee_no). */
    employeeNumber: string | null;
    /** Resolved secondary MIS agency name (cat_mis_group2 → mis_group.path). */
    misAgency: string | null;
    /**
     * Requesting officer's full name. Resolved from
     * `loan_acct_info.solicitor` → `mis_group.path` (group_no=2) →
     * `description`. Falls back to null when the borrower's account has
     * no solicitor or the path cannot be resolved.
     */
    requestingOfficer: string | null;
    /** "<years> years, <months> months" — sourced from check_list_data CCR10. */
    lengthOfService: string | null;
}

/**
 * Full payload returned by `GET /api/webloans/cis/{cisNo}/search`.
 *
 * NOTE: the legacy comment block above this contract mentioned several
 * nested sections (`branchAndType.lai`, `personalInformation.firstName`,
 * `outstandingLoans`, `ebiReloanAccounts`, `buyOutAccounts`,
 * `incomingLoans`, `deviation`, `optionalInformation`). Those do NOT
 * exist on the wire — the backend returns ONLY the two flat keys below.
 * Outstanding loans are sourced from the dedicated
 * `GET /api/webloans/cis/{cisNo}/accounts/{accountNo}/pending-loan`
 * endpoint once the AO picks an account; EBI reloan / buy-out /
 * incoming-loan sections are entered manually in ALAS (no backend
 * endpoint exposes them yet).
 */
export interface WebLoanCisSearchResponse {
    borrower: WebLoanBorrower;
    accounts: WebLoanAccount[];
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

// ─── Outstanding Loans (CIS + Account + bch) ─────────────────────────────────

/**
 * One row from GET
 * `/api/webloans/cis/{cisNo}/accounts/{accountNo}/outstanding-loans`.
 *
 * Mirrors `OutstandingLoanDto` on the backend. Backed by the reference SQL
 * (see `WebLoanRepository.GetOutstandingLoansAsync`):
 *
 *   SELECT ... FROM webloan.dbo.loan_data
 *    WHERE acct_no = @acct
 *      AND (@bch IS NULL OR bch = @bch)
 *      AND webloan.dbo.is_loan(loan_no) = 1
 *      AND loan_status != 10
 *    ORDER BY date_granted DESC
 *
 * The list is branch-scoped server-side: non-Admin callers only see their
 * own branch's outstanding balances (== JWT `branchId`); Admin bypasses
 * the branch filter and `branchCode` echoes `"ALL"`.
 *
 * **Field mapping note — `principalBalance` IS the OUTSTANDING BALANCE.**
 * `principalBalance` mirrors `loan_data.principal_bal` (current principal
 * balance, not original). The frontend uses this value to populate the
 * "Outstanding Balance" column of the obligations table on the new-loan
 * form. `principal` mirrors `loan_data.principal` (original loan amount)
 * and feeds the "Principal Balance" column so the AO can see both side by
 * side.
 *
 * `productStatus` is a pre-joined `"<productCode> - <status label>"`
 * display string the backend assembles in `WebLoanService`. The
 * `productCode` field is the bare loan_product code (e.g. `"PL"`).
 */
export interface OutstandingLoan {
    /** Promissory Note number (loan_data.loan_no). */
    loanNo: string | null;
    /** Original loan principal (loan_data.principal). */
    principal: number | null;
    /** Current principal balance — i.e. OUTSTANDING BALANCE (loan_data.principal_bal). */
    principalBalance: number | null;
    /**
     * Monthly amortization amount (CASE-computed on the backend). For
     * C35/C23 products this mirrors `principal`; for everything else
     * it mirrors `amort_data.total_amort` for the first scheduled
     * installment (amort_no = 1). Null when no amort_data row exists
     * for a non-C35/C23 loan — the form should render this as "—".
     */
    amortAmount: number | null;
    /** Date the loan was granted (ISO 8601, full datetime — slice to yyyy-MM-dd for <input type="date">). */
    dateGranted: string | null;
    /** Maturity date (ISO 8601, full datetime). */
    dateMaturity: string | null;
    /** Loan product code (loan_data.loan_product, e.g. "PL"). */
    productCode: string;
    /** Pre-joined "<productCode> - <status label>" display string. */
    productStatus: string;
    /**
     * Pre-joined "<productCode> - <description>" display string (e.g.
     * "C35 - Quick Loan"). Sourced from a LEFT JOIN to
     * webloan.dbo.loan_product on (ld.loan_product = lp.id_code); falls
     * back to the bare product code when no description resolves.
     *
     * Frontend contract: this is the *product description* we display
     * for the obligation's "name" when it is moved into the EBI Reloans
     * section. `productStatus` is the loan's *status* label (e.g. "C35
     * - Active") and is intentionally distinct from the product
     * description — see `mapToEbi` in `loan-transfer-utils.ts` for the
     * transfer that wires this through.
     */
    productWithDescription: string;
}

/**
 * Response from GET
 * `/api/webloans/cis/{cisNo}/accounts/{accountId}/outstanding-loans`.
 *
 * The backend returns:
 *   - 200 with `{ loans: [] }` when the (cisNo, accountId) pair is valid
 *     but has no outstanding balances; the frontend treats this as a
 *     successful empty list.
 *   - 404 when the account↔CIS pair is unknown (anti-enumeration guard
 *     runs before any loan row is read). The caller surfaces that as
 *     an error.
 */
export interface OutstandingLoansResponse {
    /** Echo of the cis filter. */
    cisNo: string;
    /**
     * Combined "<branchCode>-<accountNo>" identifier echoed from the
     * URL. Pass this back unchanged for any follow-up call.
     */
    accountId: string;
    /**
     * Branch code parsed from `accountId` (== webloan `bch`). The
     * backend no longer consults the JWT `branchId` claim for this
     * endpoint — the URL branch is the only filter.
     */
    branchCode: string;
    /** Account number parsed from `accountId` (== webloan `acct_no`). */
    accountNo: string;
    /** Active `loan_data` rows for the (cisNo, accountId) pair. */
    loans: OutstandingLoan[];
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
    termDays?: number | null;
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

// ─── Pending Loans (CIS + Account + bch) ───────────────────────────────────

/**
 * One row from GET
 * `/api/webloans/cis/{cisNo}/accounts/{accountId}/pending-loan`.
 *
 * Mirrors `PendingLoanDto` on the backend. Each row represents one
 * in-flight pre_loan_data row enriched with loan_data fields
 * (principal, granted rate, product, purpose, creation type).
 *
 * **Important — `principalBalance` is the OUTSTANDING BALANCE.**
 * On the backend, `Principal` (loan_data.principal) is the **current
 * principal balance** (i.e. `principal_bal`) for an active loan — it is
 * NOT the original loan amount. The frontend treats this field as the
 * outstanding balance when pre-filling the obligation rows.
 */
export interface PendingLoan {
    /** Loan number (loan_data.loan_no / pre_loan_data.loan_no). */
    loanNo: string;
    /**
     * Current principal balance. Mirrors `loan_data.principal` on the
     * backend, which is `principal_bal` (the outstanding balance) for
     * an active loan, not the original principal.
     */
    principal: number | null;
    /** Interest rate as a number (loan_data.granted_rate). */
    grantedRate: number | null;
    /** Total term in days (`total_amortization * 30` from the SQL). */
    totalTermDays: number | null;
    /**
     * "<loan_product> - <description>" display string, pre-joined on the
     * backend (e.g. "PL - Payroll Loan"). Falls back to the bare product
     * code when no description resolves.
     */
    productWithDescription: string;
    /** Loan purpose description (loan_data.cat_loan_purpose → mis_group). */
    loanPurpose: string | null;
    /**
     * Raw creation type code (loan_data.creation_type). One of:
     * 0 = New Loan, 1 = Reloan, 2 = Restructured, 6 = Additional Loan.
     * Null when no loan_data row joined onto the pre_loan_data row.
     */
    creationType: number | null;
    /**
     * Human-readable creation type label, e.g. "New Loan", "Reloan",
     * "Restructured", "Additional Loan", or "Unknown" when the code is
     * unrecognized / null. Mirrors the CASE block in the backend
     * service.
     */
    creationTypeLabel: string;
}

/**
 * Response wrapper for
 * GET /api/webloans/cis/{cisNo}/accounts/{accountId}/pending-loan.
 *
 * The endpoint returns a 200 with `loans: []` when the (cisNo, accountId)
 * pair is valid but has no in-flight loans; the frontend treats this as
 * a successful empty list. A 404 means the account↔CIS pair is unknown —
 * that is a real error and surfaces in the same way as the other webloan
 * endpoints.
 */
export interface PendingLoanResponse {
    /** Echo of the cis filter. */
    cisNo: string;
    /** Combined "<branchCode>-<accountNo>" identifier echoed from the URL. */
    accountId: string;
    /**
     * Branch code parsed from `accountId` (== webloan `bch`). The
     * backend no longer consults the JWT `branchId` claim for this
     * endpoint — the URL branch is the only filter.
     */
    branchCode: string;
    /** Account number parsed from `accountId` (== webloan `acct_no`). */
    accountNo: string;
    /** In-flight pre_loan_data rows enriched with loan_data fields. */
    loans: PendingLoan[];
    /** CIS-level NTHP (Net Take-Home Pay) amount (CCR07 row). */
    nthp: string | null;
    /** CCR07 expiration — NTHP date. */
    nthpDate: string | null;
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

// ─── Loan Products (bank policy mirror) ──────────────────────────────────────
//
// Mirrors the backend `Features/Loans/ILoanProductService.cs` and
// `Features/Loans/LoanProduct.cs` contract. The ALAS backend is the *mirror*
// of webloan's `dbo.loan_product` catalog — it owns the policy columns
// (eligibility bounds, fees, advance-interest rate) and webloan is the
// source of truth for existence + retirement.
//
// Two responsibilities are split between the two systems:
//   - **Existence & retirement** — driven by the webloan sync
//     (`POST /api/loan-products/sync`). Updates `IsRetired` and
//     `LastSyncedAt` on every run. The admin UI cannot change these.
//   - **Policy fields** — owned by ALAS. Updated by ops through the admin
//     UI via `PUT /api/loan-products/{code}`. The PK in the URL is the
//     webloan `id_code` (e.g. "C35"), NOT a surrogate int — the entity
//     has no int id column.
//
// Editable surface (UpdateLoanProductPayload) is the exact 8-field shape
// of `UpdateLoanProductRequest` on the backend, validated by
// `UpdateLoanProductValidator` server-side:
//   - MinAmount, MaxAmount                  (eligibility bounds, PHP)
//   - MinTermDays, MaxTermDays              (eligibility bounds, days)
//   - NotarialFee, DocStampFee, InsuranceFee (flat fees, PHP)
//   - AdvanceInterestRate                   (decimal fraction, 0-1)
//
// `IsRetired` and `LastSyncedAt` are **read-only** from the admin surface
// — they are owned by the sync. The admin row shows them as a
// staleness/retirement chip so ops can spot a stale row at a glance.

/**
 * Mirrors `LoanProductResponse` on the backend (the list/get response
 * for `/api/loan-products` and `/api/loan-products/active`).
 *
 * PK is `code` (string), matching the backend's choice of
 * `webloan.loan_product.id_code` as the natural key. The mirror
 * deliberately does NOT carry an `id: number` — the entity has no
 * surrogate id, and adding one on the FE would silently mask the
 * `string`-keyed URL the backend actually routes on.
 */
export interface LoanProductResponse {
    /** webloan `id_code` (e.g. "PL", "MPL", "C35", "C23"). Natural key. */
    code: string;
    /** Human-readable description (synced from webloan; admin cannot edit). */
    description: string;
    /** Floor on the principal an AO can request (PHP). */
    minAmount: number;
    /** Ceiling on the principal (PHP). */
    maxAmount: number;
    /** Shortest term an AO can request (whole days). */
    minTermDays: number;
    /** Longest term (days). Capped at 2555 by the validator (7-year bank rule). */
    maxTermDays: number;
    /** Flat notarial fee (PHP). */
    notarialFee: number;
    /** Flat documentary-stamps fee (PHP). */
    docStampFee: number;
    /** Flat insurance fee (PHP). */
    insuranceFee: number;
    /** Advance-interest annual rate as a decimal fraction (0.12 = 12% p.a.). */
    advanceInterestRate: number;
    /**
     * Mirrored from webloan. Read-only on the admin surface.
     * True when webloan has a non-null `expiration` on the source row.
     */
    isRetired: boolean;
    /** When the row was last touched by the sync. Drives the staleness chip. */
    lastSyncedAt: string;
}

/**
 * Admin write payload for `PUT /api/loan-products/{code}`.
 *
 * This is intentionally narrow: the endpoint can ONLY change policy
 * fields. Sync-owned fields (code, description, isRetired, lastSyncedAt)
 * are preserved by `LoanProductService.UpdateAsync` — sending them here
 * would be ignored, so we don't accept them in the type.
 *
 * Mirrors `UpdateLoanProductRequest` (`Features/Loans/ILoanProductService.cs`).
 */
export interface UpdateLoanProductPayload {
    minAmount: number;
    maxAmount: number;
    minTermDays: number;
    maxTermDays: number;
    notarialFee: number;
    docStampFee: number;
    insuranceFee: number;
    advanceInterestRate: number;
}

/**
 * Result of a manual sync run (`POST /api/loan-products/sync`).
 * Mirrors `LoanProductSyncResult` on the backend.
 */
export interface LoanProductSyncResult {
    /** Brand-new rows added to the ALAS mirror. */
    added: number;
    /** Existing rows whose IsRetired or Description changed during the run. */
    updated: number;
    /** Rows whose policy fields were left untouched by the sync. */
    preserved: number;
    /** When the run finished (UTC, ISO-8601). */
    syncedAt: string;
}

/**
 * Query parameters for `GET /api/loan-products/active`.
 *
 * The list endpoint (`GET /api/loan-products`) takes no params — it
 * returns every row in the mirror (active + retired). The `/active`
 * variant is what the AO-facing loan-creation form uses to populate
 * its product dropdown.
 */
export interface LoanProductsQuery {
    /** Restrict to active products (default true for AO-facing dropdowns). */
    isActive?: boolean;
    /** Optional filter by code (e.g. "PL"). */
    code?: string;
}
