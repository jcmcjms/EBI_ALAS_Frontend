import type { LoanDetailResponse } from "../api/loan-review";
import type { LoanApplicationFormData } from "../schemas/schema";
import { CREATION_TYPE, type DeviationReason } from "../schemas/schema";

/**
 * Maps backend LoanDetailResponse to frontend LoanApplicationFormData.
 * Used by both Approval and Evaluation pages to hydrate forms.
 *
 * @param l - Backend loan detail response
 * @returns Frontend form data structure
 * @see LoanDetailResponse - API response type
 * @see LoanApplicationFormData - Frontend form schema
 */
export function mapLoanToFormData(l: LoanDetailResponse): LoanApplicationFormData {
    // Codes outside the 0/1/2/6 enum silently collapse to NEW_LOAN.
    const creationTypeCode: 0 | 1 | 2 | 6 =
        l.creationTypeCode === CREATION_TYPE.RELOAN
            ? CREATION_TYPE.RELOAN
            : l.creationTypeCode === CREATION_TYPE.RESTRUCTURED
              ? CREATION_TYPE.RESTRUCTURED
              : l.creationTypeCode === CREATION_TYPE.ADDITIONAL_LOAN
                ? CREATION_TYPE.ADDITIONAL_LOAN
                : CREATION_TYPE.NEW_LOAN;

    // Backend sends free-text deviation reasons; anything outside the schema
    // enum is dropped here so the DeviationReason type holds.
    const deviationDetails: DeviationReason[] = (l.deviationDetails ?? []).filter(
        (reason): reason is DeviationReason =>
            typeof reason === "string" &&
            (reason === "Age not within the prescribed parameters" ||
                reason === "Discounted Application Fee" ||
                reason === "Interest rate reduction" ||
                reason === "Lacking bank statement of account" ||
                reason === "Lacking CIBI" ||
                reason === "Lacking marriage cert. with surname as single" ||
                reason === "Lacking one or two payslip(s) for new atm loan" ||
                reason === "Lacking signature in application form" ||
                reason === "Lacking SPAs to claim ATM" ||
                reason === "No appointment record and/or service record" ||
                reason === "No FI SOA and loan ledger" ||
                reason === "No latest payslip" ||
                reason === "No interview sheet" ||
                reason === "No orientation form or old form submitted" ||
                reason === "No valid identification cards" ||
                reason ===
                    "Total consumer loan exposure exceeding 1.2 million" ||
                reason === "With blocked ATIM in same school" ||
                reason ===
                    "With history of delinquency in the latest loan availment" ||
                reason === "With NFIS findings" ||
                reason === "With past due account - non performing loan" ||
                reason === "With past due account - performing")
    );

    // Shape gap: optional DTO fields are defaulted above, so this is a
    // deliberate double cast rather than an exact assignment.
    return {
        branchType: {
            creationTypeCode,
            creationTypeLabel: l.creationTypeLabel ?? "New Loan",
            branch: l.branchCode,
            requestingOfficer: l.requestingOfficer ?? "",
            lai: l.lai ?? l.lamId,
        },
        client: {
            cisId: l.cisId ?? "",
            firstName: l.firstName,
            middleName: l.middleName,
            lastName: l.lastName,
            suffix: l.suffix,
            birthdate: l.birthdate,
            address: l.address,
            agency: l.agency ?? "",
            position: l.position,
            employeeId: l.employeeId,
            netTakeHomePay: l.netTakeHomePay ?? 0,
            lengthOfService: l.lengthOfService,
            region: l.region,
            divisionCode: l.divisionCode,
            stationCode: l.stationCode,
            misAgency: l.misAgency,
            school: l.school,
            referrer: l.referrer,
        },
        // Multi-loan migration: the legacy single `loan` field was removed
        // from the schema in favour of `loans[]`. The approval page
        // renders ONE approval form per loan in this array (see
        // `loanIndex` prop on ApprovalFormDocument).
        loans: [
            {
                loanNo: l.loanNo ?? "",
                productCode: l.productCode ?? "",
                productDescription: l.product,
                creationTypeCode,
                creationTypeLabel: l.creationTypeLabel ?? "New Loan",
                branchCode: l.branchCode,
                parameters: {
                    product: l.product,
                    purpose: l.purpose ?? "",
                    proposedAmount: l.proposedAmount,
                    term: l.termDays,
                    // Policy term (months) — not surfaced by the
                    // approval endpoint's `LoanDetailResponse` yet
                    // (it carries `termDays` only). Falls through as
                    // undefined so the form schema's `.optional()`
                    // accepts it; the field renders blank on the
                    // approval-page context.
                    policyTermMonths: undefined,
                    interestRate: l.interestRate,
                    nthpDate: l.nthpDate,
                    notarialFee: l.notarialFee ?? 0,
                    docStamps: l.docStamps ?? 0,
                    insurance: l.insurance ?? 0,
                    standardFeesSnapshot: {
                        notarialFee: l.standardNotarialFee ?? 0,
                        docStamps: l.standardDocStamps ?? 0,
                        insurance: l.standardInsurance ?? 0,
                    },
                },
            },
        ],
        outstandingLoans: l.outstandingLoans.map((o) => ({
            pn: o.pn,
            principalBalance: o.principalBalance,
            amortization: o.amortization,
            outstandingBalance: o.outstandingBalance,
            dateGranted: o.dateGranted,
            dateMaturity: o.dateMaturity,
            status: o.status,
        })),
        ebiReloans: l.ebiReloans.map((e) => ({
            pn: e.pn,
            name: e.name,
            existingDeduction: e.existingDeduction,
            outstandingBalance: e.outstandingBalance,
            payToClose: e.payToClose,
        })),
        buyOuts: l.buyOuts.map((b) => ({
            pn: b.pn,
            name: b.name,
            amortization: b.amortization,
            outstandingBalance: b.outstandingBalance,
        })),
        incomingLoans: l.incomingLoans.map((i) => ({
            name: i.name,
            deductions: i.deductions,
            remarks: i.remarks,
        })),
        verification: {
            findings: l.verificationFindings ?? "",
        },
        deviations: {
            hasDeviations: l.hasDeviations,
            deviationDetails,
            deviationJustifications: l.deviationJustifications ?? {},
            remarks: l.remarks ?? "",
            aoRecommendation: l.aoRecommendation ?? "",
            otherRemarks: l.otherRemarks ?? "",
            feeDeviationJustification: l.feeDeviationJustification ?? "",
        },
    } as unknown as LoanApplicationFormData;
}