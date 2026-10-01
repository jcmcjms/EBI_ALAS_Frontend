import { z } from 'zod'
import {
  isRichTextEmpty,
  RICH_TEXT_MAX_CHARS,
  richTextToPlainText,
} from '@/src/shared/lib/rich-text'

export const CREATION_TYPE = {
  NEW_LOAN: 0,
  RELOAN: 1,
  RESTRUCTURED: 2,
  ADDITIONAL_LOAN: 6,
} as const

export const CREATION_TYPE_LABELS: Record<
  (typeof CREATION_TYPE)[keyof typeof CREATION_TYPE],
  string
> = {
  [CREATION_TYPE.NEW_LOAN]: 'New Loan',
  [CREATION_TYPE.RELOAN]: 'Reloan',
  [CREATION_TYPE.RESTRUCTURED]: 'Restructured',
  [CREATION_TYPE.ADDITIONAL_LOAN]: 'Additional Loan',
}

export const HidesOutstandingLoans = (
  code: CreationTypeCode | null | undefined,
): boolean =>
  code === CREATION_TYPE.NEW_LOAN || code === CREATION_TYPE.ADDITIONAL_LOAN

export const creationTypeCodeSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(6),
  z.null(),
])

export const branchTypeSchema = z.object({
  creationTypeCode: creationTypeCodeSchema,

  creationTypeLabel: z.string(),
  branch: z.string().min(1, 'Branch is required'),
  requestingOfficer: z.string().min(1, 'Requesting officer is required'),
  lai: z.string().optional(),
})

export const clientSchema = z.object({
  cisId: z.string().min(1, 'CIS ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional(),
  birthdate: z.string().optional(),
  address: z.string().optional(),
  agency: z.string().min(1, 'Agency is required'),
  position: z.string().optional(),
  employeeId: z.string().optional(),
  netTakeHomePay: z.number().min(0, 'NTHP must be positive').optional(),
  lengthOfService: z.string().optional(),
  region: z.string().optional(),
  divisionCode: z.string().optional(),
  stationCode: z.string().optional(),
  misAgency: z.string().optional(),

  school: z
    .string()
    .max(200, 'School name must not exceed 200 characters')
    .optional(),
  referrer: z
    .string()
    .max(100, 'Referrer name must not exceed 100 characters')
    .optional(),
})

export const outstandingLoanSchema = z.object({
  pn: z.string(),
  principalBalance: z.number().default(0),
  amortization: z.number().default(0),
  outstandingBalance: z.number().default(0),
  dateGranted: z.string().optional(),
  dateMaturity: z.string().optional(),
  status: z.string().default('Active'),
  productWithDescription: z.string().optional(),
})

export const preLoanRefSchema = z.object({
  id: z.number(),
  accountNo: z.string().min(1, 'Account number is required'),
  bch: z.string().min(1, 'Branch code is required'),
  formNumber: z.string().optional(),
  productDescription: z.string().optional(),
})

export const ebiReloanSchema = z.object({
  pn: z.string().default(''),
  name: z.string().default(''),
  existingDeduction: z.number().default(0),
  outstandingBalance: z.number().default(0),
  payToClose: z
    .number()
    .min(0, 'Pay to close must be a positive amount')
    .default(0),
})

export const buyOutSchema = z.object({
  pn: z.string().default(''),
  name: z.string().default(''),
  amortization: z.number().default(0),
  outstandingBalance: z.number().default(0),
})

export const incomingLoanSchema = z.object({
  name: z.string().default(''),
  deductions: z.number().default(0),
  remarks: z.string().default(''),
})

export const loanParametersSchema = z.object({
  product: z.string(),
  purpose: z.string(),
  proposedAmount: z.number().default(0),
  term: z.number().default(0),
  policyTermMonths: z.number().optional(),
  interestRate: z.number().optional(),
  nthpDate: z.string().optional(),

  notarialFee: z.number().default(0),
  docStamps: z.number().default(0),
  insurance: z.number().default(0),

  standardFeesSnapshot: z
    .object({
      notarialFee: z.number().default(0),
      docStamps: z.number().default(0),
      insurance: z.number().default(0),
    })
    .default({ notarialFee: 0, docStamps: 0, insurance: 0 }),
})

export const verificationSchema = z.object({
  findings: z
    .string()
    .refine(
      (html) => !isRichTextEmpty(html),
      'Findings are required. Document what was verified.',
    )
    .refine(
      (html) => richTextToPlainText(html).length <= RICH_TEXT_MAX_CHARS,
      `Findings must be ${RICH_TEXT_MAX_CHARS} characters or fewer.`,
    ),
})

export const DEVIATION_REASONS = [
  'Age not within the prescribed parameters',
  'Discounted Application Fee',
  'Interest rate reduction',
  'Lacking bank statement of account',
  'Lacking CIBI',
  'Lacking marriage cert. with surname as single',
  'Lacking one or two payslip(s) for new atm loan',
  'Lacking signature in application form',
  'Lacking SPAs to claim ATM',
  'No appointment record and/or service record',
  'No FI SOA and loan ledger',
  'No latest payslip',
  'No interview sheet',
  'No orientation form or old form submitted',
  'No valid identification cards',
  'Total consumer loan exposure exceeding 1.2 million',
  'With blocked ATIM in same school',
  'With history of delinquency in the latest loan availment',
  'With NFIS findings',
  'With past due account - non performing loan',
  'With past due account - performing',
] as const

export type DeviationReason = (typeof DEVIATION_REASONS)[number]

const MIN_JUSTIFICATION_LENGTH = 5

export const deviationsSchema = z
  .object({
    hasDeviations: z.boolean().default(false),
    deviationDetails: z.array(z.enum(DEVIATION_REASONS)).default([]),

    deviationJustifications: z
      .record(z.string(), z.string().trim())
      .default({}),
    remarks: z.string().optional(),
    aoRecommendation: z.string().optional(),
    otherRemarks: z.string().trim().min(1, 'Other remarks are required.'),

    feeDeviationJustification: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasDeviations && data.deviationDetails.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deviationDetails'],
        message:
          'Select at least one deviation reason when the deviations flag is enabled.',
      })
    }

    if (data.hasDeviations && data.deviationDetails.length > 0) {
      data.deviationDetails.forEach((reason) => {
        const justification = data.deviationJustifications?.[reason]
        const trimmed = justification?.trim() ?? ''
        if (trimmed.length < MIN_JUSTIFICATION_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['deviationJustifications', reason],
            message: `Provide a justification (at least ${MIN_JUSTIFICATION_LENGTH} characters) for "${reason}".`,
          })
        }
      })
    }
  })

export const selectedLoanSchema = z.object({
  loanNo: z.string().min(1, 'Loan number is required'),

  productCode: z.string(),

  productDescription: z.string(),

  creationTypeCode: creationTypeCodeSchema,

  creationTypeLabel: z.string(),

  branchCode: z.string(),

  parameters: loanParametersSchema,

  approvalTermDays: z.number().optional(),

  annualRatePercent: z.number().optional(),

  cDocStamp: z.number().optional(),

  ebiReloans: z.array(ebiReloanSchema).default([]),
  buyOuts: z.array(buyOutSchema).default([]),
  incomingLoans: z.array(incomingLoanSchema).default([]),

  verification: verificationSchema,

  deviations: deviationsSchema,
})

export const loanApplicationSchema = z
  .object({
    branchType: branchTypeSchema,
    client: clientSchema,

    loans: z
      .array(selectedLoanSchema)
      .min(1, 'Select at least one loan to process.'),
    outstandingLoans: z.array(outstandingLoanSchema).default([]),
    preLoan: preLoanRefSchema.optional(),

    loanType: z.enum(['New', 'Renewal']).default('New'),
  })
  .superRefine((data, ctx) => {
    const { loans } = data

    const FEES_TOLERANCE = 0.01

    for (let i = 0; i < loans.length; i++) {
      const loan = loans[i]
      const snapshot = loan.parameters.standardFeesSnapshot ?? {
        notarialFee: 0,
        docStamps: 0,
        insurance: 0,
      }

      const deviated =
        Math.abs(
          (loan.parameters.notarialFee ?? 0) - (snapshot.notarialFee ?? 0),
        ) > FEES_TOLERANCE ||
        Math.abs((loan.parameters.docStamps ?? 0) - (snapshot.docStamps ?? 0)) >
          FEES_TOLERANCE ||
        Math.abs((loan.parameters.insurance ?? 0) - (snapshot.insurance ?? 0)) >
          FEES_TOLERANCE

      if (deviated && !loan.deviations?.feeDeviationJustification?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['loans', i, 'deviations', 'feeDeviationJustification'],
          message:
            "Provide a justification — at least one fee on this loan deviates from the bank's standard rate.",
        })
      }
    }

    const productCodes = loans
      .map((l) => l.productCode)
      .filter((code) => code.length > 0)
    const uniqueCodes = new Set(productCodes)

    if (uniqueCodes.size !== productCodes.length) {
      const seen = new Set<string>()
      const duplicates = productCodes.filter((code) => {
        if (seen.has(code)) return true
        seen.add(code)
        return false
      })

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cannot select multiple loans of the same product (${duplicates[0]}).`,
        path: ['loans'],
      })
    }
  })

export type BranchTypeData = z.infer<typeof branchTypeSchema>

export type CreationTypeCode = NonNullable<
  z.infer<typeof creationTypeCodeSchema>
>
export type ClientFormData = z.infer<typeof clientSchema>
export type OutstandingLoan = z.infer<typeof outstandingLoanSchema>
export type EbiReloan = z.infer<typeof ebiReloanSchema>
export type BuyOut = z.infer<typeof buyOutSchema>
export type IncomingLoan = z.infer<typeof incomingLoanSchema>
export type PreLoanRef = z.infer<typeof preLoanRefSchema>
export type LoanParameters = z.infer<typeof loanParametersSchema>

export type SelectedLoan = z.infer<typeof selectedLoanSchema>
export type VerificationData = z.infer<typeof verificationSchema>
export type DeviationsData = z.infer<typeof deviationsSchema>
export type LoanApplicationFormData = z.infer<typeof loanApplicationSchema>

export function createPerLoanSectionDefaults() {
  return {
    ebiReloans: [] as EbiReloan[],
    buyOuts: [] as BuyOut[],
    incomingLoans: [] as IncomingLoan[],
    verification: { findings: '' },
    deviations: {
      hasDeviations: false,
      deviationDetails: [] as DeviationReason[],
      deviationJustifications: {} as Record<string, string>,
      aoRecommendation: '',
      otherRemarks: '',
      feeDeviationJustification: '',
    },
  }
}
