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
    userCreate: "user.create",
    userView: "user.view",
    userEdit: "user.edit",
    userSuspend: "user.suspend",
    roleManage: "role.manage",
    roleView: "role.view",
} as const;

/**
 * Static branch list — the backend has no branches endpoint yet.
 * BranchId is stored as a plain string on users.
 */
export const BRANCHES = [
    "Buhangin",
    "Bacolod",
    "Cagayan De Oro",
    "Bayugan",
    "Tandag",
    "Valencia",
    "Matina",
] as const;

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
    /** Always null from backend — populated client-side by the requesting user. */
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
    positionTitle: string | null;
    /** Not stored in webloan — always null. Populated in ALAS. */
    lengthOfService: string | null;
    regionCode: string | null;
    divisionCode: string | null;
    stationCode: string | null;
    employeeNo: string | null;
    misAgency: string | null;
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
