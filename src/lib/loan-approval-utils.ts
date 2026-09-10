/**
 * Loan Approval Utilities
 * ------------------------
 * Pure helpers shared between the approval-form preview
 * (`approval-form-preview.tsx`), the standalone document
 * (`approval-form-document.tsx`), and any future unit tests. Kept
 * out of `approval-form-document.tsx` so the file continues to
 * export *only* the component (React Refresh / HMR contract).
 *
 * The export shape mirrors the values `approval-form-document.tsx`
 * renders inline; if those change, this module must change too.
 */

import { parseProductCode } from "./loan-product-display";
import { computeMaximumLoanableAmount } from "./loan-computations";
import type {
    LoanApplicationFormData,
    SelectedLoan,
} from "../pages/loans/create/schema";

/**
 * Compute the financial metrics rendered in the printed Approval Form
 * for a single selected loan. Multi-loan applications run this once
 * per loan in `data.loans[]` and render one document each.
 *
 * Backend is the source of truth — these numbers are UI-only.
 * Compliance / accounting must always re-derive the figures from the
 * canonical ledger entries, never from these snapshots.
 */
export function computeLoanMetrics(
    primaryLoan: SelectedLoan,
    obligations: Pick<
        LoanApplicationFormData,
        "outstandingLoans" | "ebiReloans" | "buyOuts" | "incomingLoans" | "client"
    >
) {
    const { outstandingLoans, ebiReloans, buyOuts, incomingLoans, client } = obligations;
    const params = primaryLoan.parameters;

    const totalBalance = outstandingLoans.reduce((s, l) => s + (l.outstandingBalance || 0), 0);
    const totalPrincipal = outstandingLoans.reduce((s, l) => s + (l.principalBalance || 0), 0);
    const ebiDeductions = ebiReloans.reduce((s, r) => s + (r.existingDeduction || 0), 0);
    const ebiOb = ebiReloans.reduce((s, r) => s + (r.outstandingBalance || 0), 0);
    const buyOutBalance = buyOuts.reduce((s, b) => s + (b.outstandingBalance || 0), 0);
    const incomingTotal = incomingLoans.reduce((s, i) => s + (i.deductions || 0), 0);

    const termDays = params.term || 0;
    const termMonths = Math.floor(termDays / 30);
    const monthlyRate = (params.interestRate || 0) / 100 / 12;
    const amortization =
        termMonths > 0 && monthlyRate > 0
            ? (params.proposedAmount * (monthlyRate * (1 + monthlyRate) ** termMonths)) / ((1 + monthlyRate) ** termMonths - 1)
            : 0;

    const applicationCharge = params.proposedAmount * 0.0504;
    const docStamp = params.proposedAmount * 0.0075;
    const notarialFee = 500;
    const deductionsSubtotal = applicationCharge + docStamp + notarialFee;
    const deductionPct = params.proposedAmount > 0 ? (deductionsSubtotal / params.proposedAmount) * 100 : 0;

    const grossProceeds = params.proposedAmount - deductionsSubtotal;
    const netProceedsDs = grossProceeds - ebiOb;
    const netProceedsClient = netProceedsDs - buyOutBalance;
    const totalExposure = params.proposedAmount + totalPrincipal;

    const nthp = client.netTakeHomePay || 0;
    const netPayAfterDeduction = nthp - amortization + ebiDeductions;
    const totalMonthlyIncome = netPayAfterDeduction;
    // Incoming loans are added to gross disposable income (more income sources),
    // while NTHP is the preserved floor/minimum (deducted to get net capacity).
    const totalDisposableGross = nthp + ebiDeductions + incomingTotal;
    const totalDeductionsFinal = nthp;
    const totalDisposableNet = totalDisposableGross - totalDeductionsFinal;

    // Capacity-to-pay ceiling — see computeMaximumLoanableAmount docs.
    const productCode = parseProductCode(params.product);
    const maximumLoanableAmount = computeMaximumLoanableAmount(
        totalDisposableNet,
        params.interestRate || 0,
        termDays,
        productCode
    );

    return {
        termDays,
        amortization,
        applicationCharge,
        docStamp,
        notarialFee,
        deductionsSubtotal,
        deductionPct,
        grossProceeds,
        netProceedsDs,
        netProceedsClient,
        totalExposure,
        totalBalance,
        totalPrincipal,
        ebiDeductions,
        ebiOb,
        buyOutBalance,
        incomingTotal,
        nthp,
        netPayAfterDeduction,
        totalMonthlyIncome,
        totalDisposableGross,
        totalDeductionsFinal,
        totalDisposableNet,
        maximumLoanableAmount,
    };
}