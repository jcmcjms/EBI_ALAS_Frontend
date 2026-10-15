const LOAN_STATUS_TITLE_PATTERN =
  /returned|revision|resubmit|ready for recommendation|ready for evaluation|document remark|application submitted|new application/i

export function shouldInvalidateLoansOnNotification(title: string): boolean {
  return LOAN_STATUS_TITLE_PATTERN.test(title)
}
