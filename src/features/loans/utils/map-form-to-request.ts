import type { LoanSubmissionPayload } from "@/src/lib/api/types";
import type { LoanApplicationFormData } from "../schemas/schema";

/**
 * Pure form→wire mapper. Strips RHF-internal fields (`loans[].id`) and keeps
 * the payload shape identical to LoanSubmissionDtos.cs so the backend
 * validator is the single enforcement point.
 */
export function mapFormToSubmissionPayload(
    form: LoanApplicationFormData
): LoanSubmissionPayload {
    return {
        branchType: {
            creationTypeCode: form.branchType.creationTypeCode,
            creationTypeLabel: form.branchType.creationTypeLabel,
            branch: form.branchType.branch,
            requestingOfficer: form.branchType.requestingOfficer,
            lai: form.branchType.lai || undefined,
        },
        client: { ...form.client },
        loans: form.loans.map((loan) => ({
            loanNo: loan.loanNo,
            productCode: loan.productCode,
            productDescription: loan.productDescription,
            creationTypeCode: loan.creationTypeCode,
            creationTypeLabel: loan.creationTypeLabel,
            branchCode: loan.branchCode,
            parameters: loan.parameters,
            ebiReloans: loan.ebiReloans.map((row) => ({ ...row })),
            buyOuts: loan.buyOuts.map((row) => ({ ...row })),
            incomingLoans: loan.incomingLoans.map((row) => ({ ...row })),
            verification: { findings: loan.verification.findings },
            deviations: { ...loan.deviations },
        })),
        outstandingLoans: form.outstandingLoans.map((row) => ({ ...row })),
        preLoan: form.preLoan
            ? {
                  id: form.preLoan.id,
                  accountNo: form.preLoan.accountNo,
                  bch: form.preLoan.bch,
                  formNumber: form.preLoan.formNumber,
                  productDescription: form.preLoan.productDescription,
              }
            : undefined,
        loanType: form.loanType ?? "New",
    };
}
