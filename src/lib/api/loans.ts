import { apiClient } from "@/src/lib/apiClient";
import {
    unwrapApiData,
    type ApiResponse,
    type LoanSubmissionPayload,
    type LoanSubmissionResponse,
} from "./types";

/**
 * POST /api/loans — persists the full wizard payload and mints one LAM ID per
 * selected loan number.
 *
 * `idempotencyKey` makes retries safe: the same key replays the stored
 * response (200) instead of creating a second application group. The caller
 * owns the key lifecycle (see useCreateLoan).
 */
export async function submitLoanApplication(
    payload: LoanSubmissionPayload,
    idempotencyKey: string
): Promise<LoanSubmissionResponse> {
    const res = await apiClient.post<ApiResponse<LoanSubmissionResponse>>(
        "/api/loans",
        payload,
        { headers: { "Idempotency-Key": idempotencyKey } }
    );
    return unwrapApiData(res.data);
}

/**
 * Loan API surface — re-exported as a namespaced object so call sites
 * read like `loanApi.createLoan(payload)` rather than reaching into a
 * flat module. Today it just wraps the underlying submission call, but
 * keeping the indirection leaves room for read-side methods (e.g.
 * `loanApi.getMonitoring()`) to land here later without churning every
 * caller.
 */
export const loanApi = {
    /**
     * Create a new loan application group. Same on-the-wire contract as
     * {@link submitLoanApplication} — the namespaced form is preferred in
     * feature code (e.g. `useCreateLoan`) because it reads like a domain
     * API rather than a free function.
     *
     * @param payload      Full wizard payload.
     * @param idempotencyKey  GUID that dedupes retries. The hook caller
     *                        owns the lifecycle — mint once per logical
     *                        submission, rotate after success.
     */
    createLoan: (
        payload: LoanSubmissionPayload,
        idempotencyKey: string
    ): Promise<LoanSubmissionResponse> =>
        submitLoanApplication(payload, idempotencyKey),
};

/**
 * One entry on a loan's vertical audit timeline. Mirrors
 * `LoanHistoryEntryResponse` on the backend (Features/Loans/LoanSubmissionDtos.cs).
 *
 * `actionBy` is the resolved FullName of the acting user (server-side join
 * through `ActionByUser`); `fromStatus` / `toStatus` are nullable because
 * the very first `Created` row has no originating status.
 */
export interface LoanHistoryEntry {
    id: number;
    actionBy: string;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    comments?: string;
    /** ISO-8601 UTC (e.g. `"2026-09-09T08:00:00Z"`). */
    actionDate: string;
}

/**
 * GET /api/loans/{applicationId}/history
 *
 * Returns the chronological audit-trail list for a single loan. Authorization
 * is two-stage on the server: callers with `loans.view` see any loan; others
 * only see loans they created (`CreatedById == userId`). Unauthorized calls
 * surface here as an axios error with `response.status === 403`; a missing
 * loan surfaces as `response.status === 404` with the `ApiResponse` envelope
 * (`success: false, message: "Loan not found"`). Both are left to the caller
 * to render.
 */
export async function getLoanHistory(
    applicationId: number
): Promise<LoanHistoryEntry[]> {
    const res = await apiClient.get<ApiResponse<LoanHistoryEntry[]>>(
        `/api/loans/${applicationId}/history`
    );
    return unwrapApiData(res.data);
}

// ─── Loan detail (GET /api/loans/{id}) ──────────────────────────────────────
//
// Production workflow wiring (Task 11): the loan approval page used to render
// a hard-coded `dummyLoanData` blob. It now fetches a real `LoanResponse` from
// the backend, hydrates the existing `ApprovalFormDocument` via
// `mapLoanToFormData`, and lets the workflow buttons (`Recommend` /
// `Evaluate` / `Approve` / `Reject` / `Return`) call
// `PUT /api/loans/{id}/status` to advance the state machine.
//
// All DTOs below mirror `EBI.ALAS.Api/Features/Loans/LoanResponse.cs` on the
// backend. The contract is intentionally FLAT — the backend hands the client
// a single denormalized object with the loan core, the borrower snapshot, the
// outstanding obligations, the EBI/buy-out/incoming lists, and the audit
// timeline already joined in. The page-level mapping
// (`mapLoanToFormData` in `loan-approval.tsx`) reshapes this into the nested
// `LoanApplicationFormData` shape the printed form expects.

/**
 * One action row attached to a `LoanResponse`. Mirrors
 * `LoanActionResponse` on the backend (the `actions[]` collection on the
 * loan detail payload, distinct from `LoanHistoryEntry` which is the
 * vertical-timeline projection).
 *
 * `fromStatus` / `toStatus` are optional because the initial `Created`
 * row has no originating status. `comments` is the workflow remark the
 * actor typed in at the time of the transition (e.g. "Borrower has
 * excellent standing."); surfaced on the printed approval form's
 * "Remarks" block.
 */
export interface LoanActionResponse {
    id: number;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    comments?: string;
    /** ISO-8601 UTC (e.g. `"2026-09-09T08:00:00Z"`). */
    actionDate: string;
    /** Resolved FullName of the actor (mirrors `LoanHistoryEntry.actionBy`). */
    actionByUserName: string;
}

/**
 * One outstanding loan attached to the borrower's CIS snapshot. Mirrors
 * `OutstandingLoanResponse` on the backend. Backed by `loan_data` rows
 * (active obligations at the time the application was created) — the
 * backend already joins the product description into `productWithDescription`
 * so the printed approval form's "Product" column renders without a second
 * lookup.
 */
export interface OutstandingLoanResponse {
    id: number;
    /** Promissory Note number. */
    pn: string;
    /** Original principal (loan_data.principal at grant time). */
    principalBalance: number;
    /** Monthly amortization. */
    amortization: number;
    /** Current outstanding balance (loan_data.principal_bal). */
    outstandingBalance: number;
    /** Date the loan was granted, ISO-8601 (date portion). */
    dateGranted?: string;
    /** Maturity date, ISO-8601 (date portion). */
    dateMaturity?: string;
    /** Loan status label (e.g. "Active"). */
    status: string;
    /** Pre-joined "<productCode> - <description>" display string. */
    productWithDescription?: string;
}

/**
 * Buy-out obligation (loan taken from another FI). Mirrors
 * `BuyOutResponse` on the backend.
 */
export interface BuyOutResponse {
    id: number;
    /** Promissory Note number from the source FI. */
    pn: string;
    /** FI name / loan description (free-text, AO-entered on creation). */
    name: string;
    /** Monthly amortization (AO-entered). */
    amortization: number;
    /** Outstanding balance at the time of application. */
    outstandingBalance: number;
}

/**
 * EBI reloan — an existing EBI loan the new application intends to roll
 * over. Mirrors `EbiReloanResponse` on the backend.
 */
export interface EbiReloanResponse {
    id: number;
    pn: string;
    name: string;
    /** Current monthly deduction on the existing loan. */
    existingDeduction: number;
    /** Outstanding balance at the time of application. */
    outstandingBalance: number;
    /** Amount the AO intends to settle / pay-to-close. */
    payToClose: number;
}

/**
 * Incoming / undeducted loan — third-party obligations NOT yet routed
 * through payroll deduction. Mirrors `IncomingLoanResponse` on the backend.
 */
export interface IncomingLoanResponse {
    id: number;
    /** Lender name / description. */
    name: string;
    /** Monthly deduction. */
    deductions: number;
    /** Free-text remarks. */
    remarks: string;
}

/**
 * Full loan detail returned by GET /api/loans/{id}.
 *
 * Mirrors `LoanResponse` on the backend
 * (`EBI.ALAS.Api/Features/Loans/LoanResponse.cs`). This is the single
 * payload the approval page hydrates from — the page reads every field it
 * needs without firing follow-up calls.
 *
 * ## Fields
 *
 * - **Identity / metadata** — `id`, `lamId`, `applicationGroupNo`,
 *   `branchCode`, `loanNo`, `productCode`, `product`, `creationTypeCode`,
 *   `creationTypeLabel`, `requestingOfficer`, `lai`, `cisId`.
 * - **Borrower snapshot** — `firstName`, `middleName`, `lastName`,
 *   `suffix`, `birthdate`, `address`, `agency`, `position`,
 *   `employeeId`, `netTakeHomePay`, `lengthOfService`, `region`,
 *   `divisionCode`, `stationCode`, `misAgency`, `school`, `referrer`.
 * - **Loan parameters** — `proposedAmount`, `termDays`, `interestRate`,
 *   `nthpDate`, `notarialFee`, `docStamps`, `insurance`,
 *   `standardNotarialFee`, `standardDocStamps`, `standardInsurance`.
 * - **Verification / deviations** — `verificationFindings`,
 *   `hasDeviations`, `deviationDetails[]`, `deviationJustifications{}`,
 *   `remarks`, `aoRecommendation`, `otherRemarks`,
 *   `feeDeviationJustification`.
 * - **State / audit** — `status`, `applicationDate`, `lastActionDate`,
 *   `createdById`, `createdByName`, `actions[]`.
 * - **Obligation lists** — `outstandingLoans[]`, `buyOuts[]`,
 *   `ebiReloans[]`, `incomingLoans[]`.
 *
 * `*` = nullable; the backend can return null when the source column is
 * null (the `cis_info` snapshot is inherently nullable, the AO may leave
 * remarks blank, etc.). The mapping layer (`mapLoanToFormData`) defaults
 * these to empty strings / 0 before handing the payload to the form.
 */
export interface LoanResponse {
    id: number;
    /** Server-generated LAM ID / Form Number (e.g. "LA-2026-09-1234"). */
    lamId: string;
    /** Application group number (parent of all loans in a multi-loan batch). */
    applicationGroupNo: string;
    /** Owning branch code (e.g. "011"). */
    branchCode: string;
    /** Promissory Note number for this loan. */
    loanNo: string;
    /** Loan product code (e.g. "PL", "MPL", "C35"). */
    productCode: string;
    /** Loan product description (e.g. "Quick Loan"). */
    product: string;
    /** Raw creation-type byte (0=New, 1=Reloan, 2=Restructured, 6=Additional). */
    creationTypeCode?: number;
    /** Human-readable creation type label (e.g. "New Loan"). */
    creationTypeLabel?: string;
    /** Requesting officer's resolved full name. */
    requestingOfficer?: string;
    /** Loan Application Index — echoed as the LAM ID when no override. */
    lai?: string;
    /** CIS number the borrower is tied to. */
    cisId?: string;
    /** Borrower first name (CIS snapshot). */
    firstName: string;
    /** Borrower middle name (CIS snapshot). */
    middleName?: string;
    /** Borrower last name (CIS snapshot). */
    lastName: string;
    /** Borrower suffix (Jr / Sr / III / ...). */
    suffix?: string;
    /** ISO-8601 datetime — date portion is the birthday. */
    birthdate?: string;
    /** Pre-joined address (zip, street, city, province, brgy, village). */
    address?: string;
    /** Agency / employer name. */
    agency?: string;
    /** Job position / title. */
    position?: string;
    /** Employer-assigned employee number. */
    employeeId?: string;
    /** Net take-home pay (PHP). */
    netTakeHomePay?: number;
    /** "<years> years, <months> months" string from the CCR10 row. */
    lengthOfService?: string;
    /** Region label (e.g. "CARAGA"). */
    region?: string;
    /** Division code. */
    divisionCode?: string;
    /** Station code. */
    stationCode?: string;
    /** Resolved secondary MIS agency name. */
    misAgency?: string;
    /** School (manual entry, blank when N/A). */
    school?: string;
    /** Referrer (manual entry, blank when N/A). */
    referrer?: string;
    /** Stated loan purpose. */
    purpose?: string;
    /** Proposed loan principal (PHP). */
    proposedAmount: number;
    /** Total term in days. */
    termDays: number;
    /** Annual interest rate as a percent (e.g. 1.5 = 1.5% p.a.). */
    interestRate: number;
    /** NTHP validity date, ISO-8601. */
    nthpDate?: string;
    /** AO-entered notarial fee (PHP). */
    notarialFee: number;
    /** AO-entered doc-stamps fee (PHP). */
    docStamps: number;
    /** AO-entered insurance fee (PHP). */
    insurance: number;
    /** Bank-policy notarial fee snapshot at submission time. */
    standardNotarialFee: number;
    /** Bank-policy doc-stamps fee snapshot at submission time. */
    standardDocStamps: number;
    /** Bank-policy insurance fee snapshot at submission time. */
    standardInsurance: number;
    /** Verification findings (free-text, AO-entered on the wizard). */
    verificationFindings?: string;
    /** True when the AO ticked "has deviations" at submission. */
    hasDeviations: boolean;
    /** Selected deviation reasons from the fixed catalogue. */
    deviationDetails: string[];
    /** Map of deviation reason → per-reason justification. */
    deviationJustifications: Record<string, string>;
    /** Deviation remarks (free-text). */
    remarks?: string;
    /** AO recommendation (free-text). */
    aoRecommendation?: string;
    /** Other remarks (free-text). */
    otherRemarks?: string;
    /** Justification for any fee override (notarial / doc-stamps / insurance). */
    feeDeviationJustification?: string;
    /** Current workflow status (e.g. "ForRecommendation", "ForApproval"). */
    status: string;
    /** ISO-8601 datetime — application creation date. */
    applicationDate: string;
    /** ISO-8601 datetime — most recent workflow action. */
    lastActionDate: string;
    /** Numeric PK of the user that created the application. */
    createdById: number;
    /** Resolved FullName of the creating user. */
    createdByName: string;
    /** Attached workflow action rows (chronological, oldest-first). */
    actions: LoanActionResponse[];
    /** Outstanding obligations from loan_data at submission time. */
    outstandingLoans: OutstandingLoanResponse[];
    /** Buy-out obligations (AO-entered at submission time). */
    buyOuts: BuyOutResponse[];
    /** EBI reloan obligations (AO-entered at submission time). */
    ebiReloans: EbiReloanResponse[];
    /** Incoming / undeducted loan rows (AO-entered at submission time). */
    incomingLoans: IncomingLoanResponse[];
}

/**
 * GET /api/loans/{id}
 *
 * Returns the full `LoanResponse` for the given loan id. Used by the
 * approval page to hydrate the printed form document and the audit
 * timeline.
 *
 * ## Authorization
 *
 * Server-side is two-stage:
 * - Callers with `loans.view` see any loan.
 * - Others only see loans they created (`CreatedById == userId`).
 *
 * Both 403 (no access) and 404 (no such loan) surface here as axios
 * errors with `response.status` set accordingly — the caller decides
 * how to render them (the approval page maps both to its "Failed to
 * Load Application" empty-state with a Return button).
 *
 * The hook guard `enabled: Number.isFinite(applicationId) && applicationId > 0`
 * keeps React Query from firing when the URL omits `?id=...` (the page
 * routes here without a fallback id, so a missing param must short-circuit
 * before axios does).
 */
export async function getLoanById(id: number): Promise<LoanResponse> {
    const res = await apiClient.get<ApiResponse<LoanResponse>>(
        `/api/loans/${id}`
    );
    return unwrapApiData(res.data);
}

/**
 * PUT /api/loans/{id}/status — workflow state transition.
 *
 * The body is `{ status: string; comments?: string }`. The backend runs
 * `LoanWorkflowService.IsValidTransition(loan, currentStatus, targetStatus, user)`
 * which enforces BOTH:
 *   1. The (currentStatus → targetStatus) edge exists in the state machine,
 *      AND
 *   2. The acting user's role is authorized for that edge (e.g. only
 *      `Approver` / `Admin` may transition `ForApproval → Approved`).
 *
 * The frontend does NOT pre-validate either rule — the UI only renders the
 * buttons that *could* be valid for the current status + role (so the user
 * never sees a button that 409s), but the backend is the authoritative gate.
 * On a 409 (invalid transition) or 403 (role denied), the response body
 * carries an `ApiResponse.message` that the approval page surfaces as a
 * toast.
 *
 * On success the backend returns the updated `LoanResponse` (status, status-
 * transition timestamps, and the new audit row are all included) — the page
 * invalidates `queryKeys.loans.all` so the monitoring table re-renders with
 * the new status without a manual refresh.
 *
 * `comments` is the workflow remark the user typed in the side panel;
 * it is REQUIRED by the wizard (the page blocks `statusMutation.mutate`
 * when `remarks.trim()` is empty), but the backend re-validates as a
 * belt-and-braces check.
 */
export async function updateLoanStatus(
    id: number,
    payload: { status: string; comments?: string }
): Promise<LoanResponse> {
    const res = await apiClient.put<ApiResponse<LoanResponse>>(
        `/api/loans/${id}/status`,
        payload
    );
    return unwrapApiData(res.data);
}
