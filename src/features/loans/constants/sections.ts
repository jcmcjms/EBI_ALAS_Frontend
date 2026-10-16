export type SectionId =
  | 'cis-lookup'
  | 'personal-info'
  | 'loan-params'
  | 'obligations'
  | 'other-obligations'
  | 'verification'
  | 'deviations'
  | 'approval-form'

export interface SectionDef {
  id: SectionId

  step: number

  label: string

  description: string

  systemSourced?: boolean

  optional?: boolean
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'cis-lookup',
    step: 1,
    label: 'Client & Account',
    description: 'Client lookup and account selection.',
  },
  {
    id: 'personal-info',
    step: 2,
    label: 'Personal Details',
    description: 'Core borrower details from CIS.',
    systemSourced: true,
  },
  {
    id: 'loan-params',
    step: 3,
    label: 'Loan Details',
    description: 'Product, purpose, amount, and terms.',
  },
  {
    id: 'obligations',
    step: 4,
    label: 'Existing Loans',
    description: 'Active loans for the selected account.',
    systemSourced: true,
  },
  {
    id: 'other-obligations',
    step: 5,
    label: 'Financial Obligations',
    description: 'Buy-outs and incoming obligations.',
    systemSourced: true,
  },
  {
    id: 'verification',
    step: 6,
    label: 'Verification',
    description: 'Account officer findings.',
  },
  {
    id: 'deviations',
    step: 7,
    label: 'Remarks & Exceptions',
    description: 'Deviations and recommendations.',
  },
  {
    id: 'approval-form',
    step: 8,
    label: 'Review & Submit',
    description: 'Final review and approval form preview.',
    systemSourced: true,
  },
]

export const getSection = (id: SectionId): SectionDef =>
  SECTIONS.find((s) => s.id === id)!
