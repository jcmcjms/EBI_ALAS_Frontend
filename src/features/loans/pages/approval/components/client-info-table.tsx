import type {
  ClientFormData,
  LoanApplicationFormData,
} from '@/src/features/loans/schemas/schema'
import type { SelectedLoan } from '@/src/features/loans/schemas/schema'
import { cn } from '@/src/shared/lib/utils'
import {
  BLUE,
  B,
  L,
  V,
  dash,
  fullNameOf,
  ageFrom,
  isoDate,
} from './approval-form-document-utils'

interface ClientInfoTableProps {
  client: LoanApplicationFormData['client']
  branchType: LoanApplicationFormData['branchType']
  primaryLoan: SelectedLoan
  data: LoanApplicationFormData
  params: SelectedLoan['parameters']
  productDisplay: string
  approvalTermDays: number
  productLine: string
}

export function ClientInfoTable({
  client,
  branchType,
  primaryLoan,
  data,
  params,
  productDisplay,
  approvalTermDays,
  productLine,
}: ClientInfoTableProps) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        <tr>
          <td
            colSpan={8}
            className={cn(B, `${BLUE} text-center font-bold`)}
          >
            CLIENT INFORMATION
          </td>
        </tr>
        <tr>
          <td colSpan={4} className={B} />
          <td colSpan={1} className={cn(B, 'px-1.5 py-0.5 font-bold')}>
            SCHOOL TYPE:
          </td>
          <td colSpan={3} className={cn(B, BLUE)}>
            {dash(client.agency)}
          </td>
        </tr>
        <tr>
          <L className="w-[16%]">CLIENT NAME :</L>
          <V blue colSpan={3}>
            {fullNameOf(client)}
          </V>
          <L className="w-[16%]">POSITION/TITLE :</L>
          <V blue colSpan={3}>
            {dash(client.position)}
          </V>
        </tr>
        <tr>
          <L>ADDRESS:</L>
          <V blue colSpan={3}>
            {dash(client.address)}
          </V>
          <L>Age:</L>
          <V blue>{ageFrom(client.birthdate)}</V>
          <L>Length of Service:</L>
          <V blue>{dash(client.lengthOfService)}</V>
        </tr>
        <tr>
          <L>Loan Application Type:</L>
          <V blue colSpan={3}>
            {dash(branchType.creationTypeLabel)}
          </V>
          <L>LAM ID:</L>
          <V blue colSpan={3}>
            {dash(branchType.lai)}
          </V>
        </tr>
        <tr>
          <L>Region Code :</L>
          <V blue>{dash(client.region)}</V>
          <V blue colSpan={2} rowSpan={3} className="align-middle">
            PN:{' '}
            {dash(primaryLoan.loanNo || data?.outstandingLoans[0]?.pn)}
          </V>
          <L>Branch Code :</L>
          <V blue colSpan={3}>
            {dash(branchType.branch)}
          </V>
        </tr>
        <tr>
          <L>Division Code :</L>
          <V blue>{dash(client.divisionCode)}</V>
          <L>Requesting Officer:</L>
          <V blue colSpan={3}>
            {dash(branchType.requestingOfficer)}
          </V>
        </tr>
        <tr>
          <L>Employee No. :</L>
          <V blue>{dash(client.employeeId)}</V>
          <L>Processing Date :</L>
          <V blue colSpan={3}>
            {isoDate(new Date().toISOString())}
          </V>
        </tr>
        <tr>
          <L rowSpan={2} className="align-top">
            Loan Product:
          </L>
          <V rowSpan={2} className="align-top font-bold">
            {dash(productDisplay)}
          </V>
          <L rowSpan={2} className="align-top">
            TERM (Days):
            <br />
            <span className="font-bold">
              {approvalTermDays.toLocaleString()}
            </span>
          </L>
          <V blue colSpan={5}>
            {productLine}
          </V>
        </tr>
        <tr>
          <L>Loan Purpose:</L>
          <V blue colSpan={4}>
            {dash(params.purpose)}
          </V>
        </tr>
      </tbody>
    </table>
  )
}