export const WEBLOAN_BRANCHES: ReadonlyArray<{ code: string; name: string }> = [
  { code: '000', name: 'Lianga Branch' },
  { code: '002', name: 'Barobo Branch' },
  { code: '003', name: 'San Francisco Branch' },
  { code: '004', name: 'Arasasan Branch' },
  { code: '005', name: 'Hinatuan Branch' },
  { code: '006', name: 'Tagum Branch' },
  { code: '007', name: 'Tandag Branch' },
  { code: '008', name: 'Butuan Branch' },
  { code: '009', name: 'Bislig Branch' },
  { code: '011', name: 'Head Office Branch' },
  { code: '012', name: 'Cagayan Branch' },
  { code: '013', name: 'Talisay Branch' },
  { code: '014', name: 'General Santos Branch' },
  { code: '015', name: 'Panabo Branch' },
  { code: '016', name: 'Valencia Branch' },
  { code: '017', name: 'Cateel Branch' },
  { code: '018', name: 'Davao-Buhangin Branch' },
  { code: '019', name: 'Tacloban Branch' },
  { code: '020', name: 'Bacolod Branch' },
  { code: '021', name: 'Iloilo Branch' },
  { code: '022', name: 'Davao-Matina Branch' },
  { code: '023', name: 'Trento Branch' },
  { code: '024', name: 'Mati Branch' },
  { code: '025', name: 'Bayugan Branch' },
  { code: '026', name: 'Nabunturan Branch' },
  { code: '027', name: 'Madrid Branch' },
  { code: '028', name: 'Surigao Branch' },
  { code: '029', name: 'Gingoog Branch' },
  { code: '030', name: 'CTS (Mandaue) Branch' },
  { code: '031', name: 'Ronda Branch' },
  { code: '991', name: 'Corporate Center' },
]

export interface WebLoanAccount {
  bankCode: string
  branchCode: string
  accountNo: string

  accountId: string
  name: string | null
  creditLimit: number | null
  usedCredit: number | null
  borrowerType: string | null
}

export interface WebLoanBorrower {
  cisNo: string
  firstName: string
  middleName: string | null
  lastName: string

  title: string | null

  appelation: string | null

  birthDate: string | null

  address: string | null

  agencyType: string | null
  positionTitle: string | null

  region: string | null
  regionCode: string | null
  divisionCode: string | null
  stationCode: string | null

  employeeNumber: string | null

  misAgency: string | null

  requestingOfficer: string | null

  lengthOfService: string | null
}

export interface WebLoanCisSearchResponse {
  borrower: WebLoanBorrower
  accounts: WebLoanAccount[]
}

export interface ActiveLoan {
  loanNo: string

  principal: number | null

  principalBalance: number | null

  dateGranted: string | null

  dateMaturity: string | null

  loanProduct: string | null

  loanProductDescription: string | null

  statusCode: number | null

  statusDescription: string | null

  productStatus: string | null
}

export interface ActiveLoansResponse {
  accountNo: string
  cisNo: string
  loans: ActiveLoan[]
}

export interface OutstandingLoan {
  loanNo: string | null

  principal: number | null

  principalBalance: number | null

  amortAmount: number | null

  dateGranted: string | null

  dateMaturity: string | null

  productCode: string

  productStatus: string

  productWithDescription: string
}

export interface OutstandingLoansResponse {
  cisNo: string

  accountId: string

  branchCode: string

  accountNo: string

  loans: OutstandingLoan[]
}

export interface PreLoanItem {
  id: number

  cisNo: string

  accountNo: string

  bch: string

  branchName: string

  formNumber?: string | null

  productCode?: string | null
  productDescription?: string | null

  proposedAmount?: number | null
  termDays?: number | null
  interestRate?: number | null
  purpose?: string | null

  lastModifiedAt: string

  lastModifiedBy?: string | null
}

export interface PreLoansResponse {
  cisNo: string | null

  accountNo: string | null

  bch: string
  preLoans: PreLoanItem[]
}

export interface PreLoansQuery {
  cisNo?: string

  accountNo?: string
}

export interface PendingLoan {
  loanNo: string

  principal: number | null

  grantedRate: number | null

  totalTermDays: number | null

  policyTermMonths: number | null

  cDocStamp: number | null

  productWithDescription: string

  loanPurpose: string | null

  creationType: number | null

  creationTypeLabel: string
}

export interface PendingLoanResponse {
  cisNo: string

  accountId: string

  branchCode: string

  accountNo: string

  loans: PendingLoan[]

  nthp: string | null

  nthpDate: string | null
}

export interface CatLoanClassResponse {
  bch: string
  loanNo: string
  loanProduct: string
  catLoanClass: string | null
}

export interface CocreeItemStatus {
  itemCode: string

  submitted: string | null

  description: string | null

  expiration: string | null
}

export interface CocreeStatusResponse {
  cisNo: string

  isComplete: boolean

  items: CocreeItemStatus[]
}

export interface LoanSubmissionPayload {
  branchType: {
    creationTypeCode: number | null
    creationTypeLabel: string
    branch: string
    requestingOfficer: string
    lai?: string
  }
  client: {
    cisId: string
    firstName: string
    middleName?: string
    lastName: string
    suffix?: string
    birthdate?: string
    address?: string
    agency?: string
    position?: string
    employeeId?: string
    netTakeHomePay?: number
    lengthOfService?: string
    region?: string
    divisionCode?: string
    stationCode?: string
    misAgency?: string
    school?: string
    referrer?: string
  }
  loans: Array<{
    loanNo: string
    productCode: string
    productDescription: string
    creationTypeCode: number | null
    creationTypeLabel: string
    branchCode: string
    parameters: {
      product: string
      purpose: string
      proposedAmount: number
      term: number
      interestRate?: number
      nthpDate?: string
      notarialFee: number
      docStamps: number
      insurance: number
      standardFeesSnapshot: {
        notarialFee: number
        docStamps: number
        insurance: number
      }
    }
    cDocStamp?: number | null
    ebiReloans: Array<{
      pn: string
      name: string
      existingDeduction: number
      outstandingBalance: number
      payToClose: number
    }>
    buyOuts: Array<{
      pn: string
      name: string
      amortization: number
      outstandingBalance: number
    }>
    incomingLoans: Array<{ name: string; deductions: number; remarks: string }>
    verification: { findings: string }
    deviations: {
      hasDeviations: boolean
      deviationDetails: string[]
      deviationJustifications: Record<string, string>
      remarks?: string
      aoRecommendation?: string
      otherRemarks: string
      feeDeviationJustification?: string
    }
  }>
  outstandingLoans: Array<{
    pn: string
    principalBalance: number
    amortization: number
    outstandingBalance: number
    dateGranted?: string
    dateMaturity?: string
    status: string
    productWithDescription?: string
  }>
  preLoan?: {
    id: number
    accountNo: string
    bch: string
    formNumber?: string
    productDescription?: string
  }

  loanType?: 'New' | 'Renewal'
}

export interface CreatedLoanSummary {
  id: number
  lamId: string
  loanNo: string
  productCode: string
  proposedAmount: number
  status: string

  branchCode?: string | null

  product?: string | null

  creationTypeCode?: number | null

  creationTypeLabel?: string | null

  firstName?: string | null

  middleName?: string | null

  lastName?: string | null

  suffix?: string | null

  applicationDate?: string | null

  lastActionDate?: string | null

  createdByName?: string | null

  lastActionByName?: string | null

  lastAction?: string | null

  createdById?: number | null

  documentsComplete?: boolean | null

  documentsCompleteAt?: string | null

  assignedApproverName?: string | null

  requiredApprovalTier?: number | null

  assignedApproverId?: number | null

  queueStage?: string | null

  queuePosition?: number | null

  queueLength?: number | null

  queueOwnerName?: string | null

  isQueueHead?: boolean

  documentFlag?: {
    flaggedAt: string
    flaggedById: number | null
    reason: string | null
    missingCount: number
  } | null
}

export type CreateLoanPayload = LoanSubmissionPayload

export interface LoanSubmissionResponse {
  applicationGroupNo: string
  loans: CreatedLoanSummary[]
}
