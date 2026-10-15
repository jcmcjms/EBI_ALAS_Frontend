const LOAN_STATUS_TITLE_PATTERN = /returned|revision/i

export function shouldInvalidateLoansOnNotification(title: string): boolean {
  return LOAN_STATUS_TITLE_PATTERN.test(title)
}
