import type { FieldPath } from 'react-hook-form'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

/**
 * RHF splits dotted string paths into nested objects. Deviation labels like
 * "Lacking marriage cert. with surname as single" must stay literal record keys,
 * so quote the reason with bracket notation.
 */
export function deviationJustificationFieldPath(
  deviationsPath: string,
  reason: string,
): FieldPath<LoanApplicationFormData> {
  return `${deviationsPath}.deviationJustifications[${JSON.stringify(reason)}]` as FieldPath<LoanApplicationFormData>
}
