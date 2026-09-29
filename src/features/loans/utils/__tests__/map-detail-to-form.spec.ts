import { describe, expect, it } from "vitest";
import type { LoanDetailResponse } from "../../api/loan-review";
import { mapLoanDetailToFormData } from "../map-detail-to-form";

/**
 * Realistic LoanDetailResponse covering every collection the mapper
 * must place under `loans[0]` (wizard shape) rather than the root.
 */
function baseDetail(): LoanDetailResponse {
    return {
        id: 42,
        lamId: "LAM-2024-0042",
        applicationGroupNo: "GRP-001",
        branchCode: "001",
        loanNo: "PN-10001",
        productCode: "C21",
        product: "C21 - Salary Loan",
        creationTypeCode: 1,
        creationTypeLabel: "Reloan",
        requestingOfficer: "Juan Dela Cruz",
        lai: "LAI-9",
        cisId: "CIS-555",
        firstName: "Maria",
        middleName: "Santos",
        lastName: "Reyes",
        suffix: null,
        birthdate: "1985-04-12",
        address: "123 Rizal St, Manila",
        agency: "DepEd",
        position: "Teacher I",
        employeeId: "EMP-77",
        netTakeHomePay: 25000,
        lengthOfService: "5 years",
        region: "NCR",
        divisionCode: "DIV-01",
        stationCode: "ST-01",
        misAgency: "MIS-A",
        school: "Sample Elementary School",
        referrer: "Ana Lopez",
        purpose: "Home improvement",
        proposedAmount: 150000,
        termDays: 1800,
        interestRate: 7.5,
        policyTermMonths: 60,
        approvalTermDays: 1800,
        annualRatePercent: 7.5,
        nthpDate: "2024-01-15",
        notarialFee: 500,
        docStamps: 300,
        insurance: 200,
        standardNotarialFee: 500,
        standardDocStamps: 300,
        standardInsurance: 200,
        verificationFindings: "Verified employment and payroll records.",
        hasDeviations: true,
        deviationDetails: [
            "Lacking CIBI",
            "Not a real deviation reason",
            "With NFIS findings",
        ],
        deviationJustifications: {
            "Lacking CIBI": "CIBI request pending with credit bureau",
            "With NFIS findings": "NFIS hit is a namesake; borrower cleared",
        },
        remarks: "For recomputation",
        aoRecommendation: "Approve as recommended",
        otherRemarks: "No other remarks",
        feeDeviationJustification: "Notary charged extra for annexes",
        status: "ForChecking",
        applicationDate: "2024-01-10",
        lastActionDate: "2024-01-12",
        createdById: 7,
        createdByName: "Encoder One",
        actions: [],
        evaluationVerdict: null,
        documentFlag: null,
        outstandingLoans: [
            {
                id: 1,
                pn: "PN-90001",
                principalBalance: 50000,
                amortization: 2500,
                outstandingBalance: 42000,
                dateGranted: "2022-03-01",
                dateMaturity: "2027-03-01",
                status: "Active",
                productWithDescription: "C35 - Quick Loan",
            },
        ],
        buyOuts: [
            {
                id: 11,
                pn: "BO-1",
                name: "Other Bank Loan",
                amortization: 1800,
                outstandingBalance: 36000,
            },
        ],
        ebiReloans: [
            {
                id: 21,
                pn: "PN-80001",
                name: "Previous EBI Loan",
                existingDeduction: 1200,
                outstandingBalance: 27500,
                payToClose: 27500,
            },
        ],
        incomingLoans: [
            {
                id: 31,
                name: "Incoming GSIS Loan",
                deductions: 900,
                remarks: "Deduction starts next payroll",
            },
        ],
        preLoanId: 100,
        preLoanFormNumber: "F-100",
        webLoanPnNumbers: ["PN-80001"],
        documentsComplete: true,
        documentsCompleteAt: "2024-01-11",
        assignedApproverName: "Approver One",
        requiredApprovalTier: 2,
        assignedApproverId: 3,
    };
}

describe("mapLoanDetailToFormData", () => {
    it("places obligations, verification, and deviations under loans[0] (wizard shape)", () => {
        const form = mapLoanDetailToFormData(baseDetail());

        expect(form.loans).toHaveLength(1);
        const loan = form.loans[0];

        expect(loan.ebiReloans).toHaveLength(1);
        expect(loan.ebiReloans[0].outstandingBalance).toBe(27500);

        expect(loan.buyOuts).toHaveLength(1);
        expect(loan.buyOuts[0].outstandingBalance).toBe(36000);

        expect(loan.incomingLoans).toHaveLength(1);
        expect(loan.incomingLoans[0].deductions).toBe(900);

        expect(loan.verification.findings).toContain("Verified employment");
        expect(loan.deviations.deviationDetails).toEqual([
            "Lacking CIBI",
            "With NFIS findings",
        ]);
    });

    it("keeps outstandingLoans at the application root", () => {
        const form = mapLoanDetailToFormData(baseDetail());

        expect(form.outstandingLoans).toHaveLength(1);
        expect(form.outstandingLoans[0].pn).toBe("PN-90001");
        expect(form.outstandingLoans[0].outstandingBalance).toBe(42000);
    });

    it("maps frozen approvalTermDays / annualRatePercent / policyTermMonths onto loans[0]", () => {
        const form = mapLoanDetailToFormData(baseDetail());
        const loan = form.loans[0];

        expect(loan.approvalTermDays).toBe(1800);
        expect(loan.annualRatePercent).toBe(7.5);
        expect(loan.parameters.policyTermMonths).toBe(60);
    });

    it("maps null frozen fields to undefined", () => {
        const detail = baseDetail();
        detail.policyTermMonths = null;
        detail.approvalTermDays = null;
        detail.annualRatePercent = null;

        const form = mapLoanDetailToFormData(detail);
        const loan = form.loans[0];

        expect(loan.approvalTermDays).toBeUndefined();
        expect(loan.annualRatePercent).toBeUndefined();
        expect(loan.parameters.policyTermMonths).toBeUndefined();
    });
});
