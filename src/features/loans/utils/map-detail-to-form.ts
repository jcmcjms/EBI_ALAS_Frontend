import type { LoanDetailResponse } from "../api/loan-review";
import type { LoanApplicationFormData } from "../schemas/schema";
import {
    CREATION_TYPE,
    DEVIATION_REASONS,
    type DeviationReason,
} from "../schemas/schema";

const DEVIATION_REASON_SET: ReadonlySet<string> = new Set(DEVIATION_REASONS);

/**
 * Maps backend LoanDetailResponse to the wizard-shaped
 * LoanApplicationFormData consumed by ApprovalFormDocument and
 * computeLoanMetrics (both read obligations / verification /
 * deviations from `loans[loanIndex]`).
 *
 * `outstandingLoans` stays at the application root. Frozen
 * `approvalTermDays` / `annualRatePercent` land on `loans[i]`;
 * `policyTermMonths` lands on `loans[i].parameters.policyTermMonths`.
 * Backend nulls map to `undefined`.
 */
export function mapLoanDetailToFormData(
    l: LoanDetailResponse
): LoanApplicationFormData {
    // Codes outside the 0/1/2/6 enum silently collapse to NEW_LOAN.
    const creationTypeCode: 0 | 1 | 2 | 6 =
        l.creationTypeCode === CREATION_TYPE.RELOAN
            ? CREATION_TYPE.RELOAN
            : l.creationTypeCode === CREATION_TYPE.RESTRUCTURED
              ? CREATION_TYPE.RESTRUCTURED
              : l.creationTypeCode === CREATION_TYPE.ADDITIONAL_LOAN
                ? CREATION_TYPE.ADDITIONAL_LOAN
                : CREATION_TYPE.NEW_LOAN;

    // Backend sends free-text deviation reasons; anything outside the
    // schema enum is dropped so the DeviationReason type holds.
    const deviationDetails = (l.deviationDetails ?? []).filter(
        (reason): reason is DeviationReason => DEVIATION_REASON_SET.has(reason)
    );

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
            middleName: l.middleName ?? undefined,
            lastName: l.lastName,
            suffix: l.suffix ?? undefined,
            birthdate: l.birthdate ?? undefined,
            address: l.address ?? undefined,
            agency: l.agency ?? "",
            position: l.position ?? undefined,
            employeeId: l.employeeId ?? undefined,
            netTakeHomePay: l.netTakeHomePay ?? 0,
            lengthOfService: l.lengthOfService ?? undefined,
            region: l.region ?? undefined,
            divisionCode: l.divisionCode ?? undefined,
            stationCode: l.stationCode ?? undefined,
            misAgency: l.misAgency ?? undefined,
            school: l.school ?? undefined,
            referrer: l.referrer ?? undefined,
        },
        // Multi-loan migration: the legacy single `loan` field was removed
        // from the schema in favour of `loans[]`. The approval page
        // renders ONE approval form per loan in this array (see
        // `loanIndex` prop on ApprovalFormDocument). Obligations,
        // verification, and deviations belong to this loan only.
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
                    policyTermMonths: l.policyTermMonths ?? undefined,
                    interestRate: l.interestRate,
                    nthpDate: l.nthpDate ?? undefined,
                    notarialFee: l.notarialFee ?? 0,
                    docStamps: l.docStamps ?? 0,
                    insurance: l.insurance ?? 0,
                    standardFeesSnapshot: {
                        notarialFee: l.standardNotarialFee ?? 0,
                        docStamps: l.standardDocStamps ?? 0,
                        insurance: l.standardInsurance ?? 0,
                    },
                },
                approvalTermDays: l.approvalTermDays ?? undefined,
                annualRatePercent: l.annualRatePercent ?? undefined,
                cDocStamp: l.cDocStamp ?? undefined,
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
                    remarks: l.remarks ?? undefined,
                    aoRecommendation: l.aoRecommendation ?? undefined,
                    otherRemarks: l.otherRemarks ?? "",
                    feeDeviationJustification:
                        l.feeDeviationJustification ?? undefined,
                },
            },
        ],
        outstandingLoans: l.outstandingLoans.map((o) => ({
            pn: o.pn,
            principalBalance: o.principalBalance,
            amortization: o.amortization,
            outstandingBalance: o.outstandingBalance,
            dateGranted: o.dateGranted ?? undefined,
            dateMaturity: o.dateMaturity ?? undefined,
            status: o.status,
            productWithDescription: o.productWithDescription ?? undefined,
        })),
        loanType: "New",
    };
}
