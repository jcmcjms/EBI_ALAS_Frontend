import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ApprovalFormDocument } from "../approval-form-document";
import type { ApprovalFormActionEntry } from "../approval-form-document";
import type { LoanApplicationFormData } from "@/src/features/loans/schemas/schema";

const stubForm = {
    branchType: {
        creationTypeCode: 0,
        creationTypeLabel: "New Loan",
        branch: "BCH01",
        requestingOfficer: "Officer",
        lai: "LAM-001",
    },
    client: {
        cisId: "C-1",
        firstName: "Juan",
        lastName: "Dela Cruz",
        agency: "DepEd",
    },
    loans: [
        {
            loanNo: "P-001",
            productCode: "C21",
            productDescription: "C21 - Salary Loan",
            creationTypeCode: 0,
            creationTypeLabel: "New Loan",
            branchCode: "BCH01",
            parameters: {
                product: "C21 - Salary Loan",
                purpose: "Personal",
                proposedAmount: 50_000,
                term: 2520,
                interestRate: 0.0966,
                notarialFee: 500,
                docStamps: 0,
                insurance: 0,
                standardFeesSnapshot: { notarialFee: 500, docStamps: 0, insurance: 0 },
            },
            verification: { findings: "Verified" },
            deviations: {
                hasDeviations: false,
                deviationDetails: [],
                deviationJustifications: {},
                otherRemarks: "None",
            },
        },
    ],
    outstandingLoans: [],
} as unknown as LoanApplicationFormData;

describe("ApprovalFormDocument — application history (page 3)", () => {
    it("does not render the history section when actions is undefined", () => {
        render(<ApprovalFormDocument data={stubForm} />);
        expect(screen.queryByText("APPLICATION HISTORY")).not.toBeInTheDocument();
    });

    it("does not render the history section when actions is empty", () => {
        render(<ApprovalFormDocument data={stubForm} actions={[]} />);
        expect(screen.queryByText("APPLICATION HISTORY")).not.toBeInTheDocument();
    });

    it("renders the history section with grouped entries", () => {
        const actions: ApprovalFormActionEntry[] = [
            {
                id: 1,
                action: "Created",
                fromStatus: null,
                toStatus: "Draft",
                comments: null,
                actionDate: "2026-09-28T08:00:00Z",
                actionByUserName: "Maria Encoder",
            },
            {
                id: 2,
                action: "Recommended",
                fromStatus: "ForRecommendation",
                toStatus: "ForChecking",
                comments: "Docs complete, recommend for evaluation.",
                actionDate: "2026-09-28T09:30:00Z",
                actionByUserName: "Pedro Recommender",
            },
        ];

        render(<ApprovalFormDocument data={stubForm} actions={actions} />);

        expect(screen.getByText("APPLICATION HISTORY")).toBeInTheDocument();
        expect(screen.getByText("Maria Encoder")).toBeInTheDocument();
        expect(screen.getByText("Pedro Recommender")).toBeInTheDocument();
        expect(screen.getByText("Created")).toBeInTheDocument();
        expect(
            screen.getByText("Docs complete, recommend for evaluation."),
        ).toBeInTheDocument();
        // Status transition printed as "from → to"
        expect(screen.getByText(/ForRecommendation → ForChecking/)).toBeInTheDocument();
        // Null fromStatus renders as an em-dash placeholder, not empty
        expect(screen.getByText(/— → Draft/)).toBeInTheDocument();
    });

    it("groups entries by date", () => {
        const actions: ApprovalFormActionEntry[] = [
            {
                id: 1,
                action: "Created",
                fromStatus: null,
                toStatus: "Draft",
                comments: null,
                actionDate: "2026-09-27T08:00:00Z",
                actionByUserName: "Encoder",
            },
            {
                id: 2,
                action: "Recommended",
                fromStatus: "ForRecommendation",
                toStatus: "ForChecking",
                comments: null,
                actionDate: "2026-09-28T09:00:00Z",
                actionByUserName: "Recommender",
            },
        ];

        render(<ApprovalFormDocument data={stubForm} actions={actions} />);
        // Two distinct day-group header rows expected
        const dayHeaders = screen.getAllByText(/September 2[78], 2026/);
        expect(dayHeaders.length).toBe(2);
    });
});
