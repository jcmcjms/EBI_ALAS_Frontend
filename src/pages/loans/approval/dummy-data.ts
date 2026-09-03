import type { LoanApplicationFormData } from "../create/schema";

export const dummyLoanData: LoanApplicationFormData = {
  branchType: {
    loanType: "Salary Loan",
    branch: "007",
    requestingOfficer: "Maria Santos",
    lai: "LA-2026-08-9942",
  },
  client: {
    cisId: "CIS-99210",
    firstName: "Juan",
    middleName: "Dela",
    lastName: "Cruz",
    suffix: "",
    birthdate: "1985-04-12",
    address: "123 Rizal St., Tandag City, Surigao del Sur",
    agency: "Public School Teacher",
    position: "Teacher III",
    employeeId: "EMP-883721",
    netTakeHomePay: 35000,
    lengthOfService: "8 years",
    region: "CARAGA",
    divisionCode: "DIV-01",
    stationCode: "ST-007",
    misAgency: "DepEd",
    school: "Tandag National Comprehensive High School",
    referrer: "Employee Referral (Pedro Penduko)",
  },
  loan: {
    product: "Multi-Purpose Loan",
    purpose: "Home Renovation and Tuition Fee",
    proposedAmount: 150000,
    term: 36,
    interestRate: 1.5,
    nthpDate: "2026-08-30",
  },
  outstandingLoans: [
    {
      pn: "PN-10029",
      principalBalance: 20000,
      amortization: 1500,
      outstandingBalance: 22000,
      dateGranted: "2025-01-10",
      dateMaturity: "2027-01-10",
      status: "Active",
    },
  ],
  ebiReloans: [],
  buyOuts: [],
  incomingLoans: [],
  verification: {
    findings: "Verified employment and residence. No derogatory records found.",
  },
  deviations: {
    hasDeviations: false,
    // `deviationDetails` is now a DeviationReason[] (the fixed
    // catalogue surfaced by the wizard's checkbox group). The dummy
    // approval document renders an empty list as "-", so we seed
    // the array explicitly even when the toggle is off — this keeps
    // the type narrow and avoids a string → array widening here.
    deviationDetails: [],
    aoRecommendation: "Highly recommended for approval. Good repayment history.",
    otherRemarks: "",
    remarks: "",
  },
};