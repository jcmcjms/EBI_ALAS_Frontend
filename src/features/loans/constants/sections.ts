
export type SectionId =
  | "cis-lookup"
  | "personal-info"
  | "loan-params"
  | "obligations"
  | "other-obligations"
  | "verification"
  | "deviations"
  | "approval-form";

export interface SectionDef {
  id: SectionId;
  
  step: number;
  
  label: string;
  
  description: string;
  
  systemSourced?: boolean;
  
  optional?: boolean;
}

export const SECTIONS: SectionDef[] = [
  {
    id: "cis-lookup",
    step: 1,
    label: "Client, Account & Preloan",
    description: "CIS lookup, branch routing and preloan selection.",
  },
  {
    id: "personal-info",
    step: 2,
    label: "Personal & Agency",
    description:
      "Core borrower details sourced from the legacy CIS database. Fields other than Suffix are read-only.",
    systemSourced: true,
  },
  {
    id: "loan-params",
    step: 3,
    label: "Loan Parameters",
    description: "Product, purpose, amount, term and rate.",
  },
  {
    id: "obligations",
    step: 4,
    label: "Outstanding Loans",
    description: "Active loans for the selected account.",
    systemSourced: true,
  },
  {
    id: "other-obligations",
    step: 5,
    label: "EBI, Buy-Outs & Incoming",
    description: "Other EBI loans, buy-outs and incoming obligations.",
    systemSourced: true,
  },
  {
    id: "verification",
    step: 6,
    label: "Verification Conducted",
    description: "Account officer verification findings.",
  },
  {
    id: "deviations",
    step: 7,
    label: "Remarks & Deviations",
    description: "Deviations, remarks and AO recommendation.",
  },
  {
    id: "approval-form",
    step: 8,
    label: "Approval Form",
    description: "Live preview of the approval document.",
    systemSourced: true,
  },
];

export const getSection = (id: SectionId): SectionDef =>
  SECTIONS.find((s) => s.id === id)!;
