export const loanKeys = {
  all: ['loans'] as const,

  lists: <T extends object>(params?: T) =>
    ['loans', 'list', params ?? {}] as const,
  monitoring: <F, P, S>(filters: F, pagination: P, sorting: S) =>
    ['loans', 'monitoring', filters, pagination, sorting] as const,

  slaPolicy: ['loans', 'sla-policy'] as const,

  queueDefault: ['loans', 'queue-default'] as const,

  review: {
    detail: (id: number) => ['loans', 'review', id, 'detail'] as const,
    history: (id: number) => ['loans', 'review', id, 'history'] as const,
    timeline: (id: number) => ['loans', 'review', id, 'timeline'] as const,
    attachments: (id: number) =>
      ['loans', 'review', id, 'attachments'] as const,
    checklistDocuments: (id: number) =>
      ['loans', 'review', id, 'checklist-documents'] as const,
    deviations: (id: number) =>
      ['loans', 'review', id, 'deviations'] as const,
  },

  history: (id: number) => ['loans', id, 'history'] as const,

  documentRemarks: (loanId: number) =>
    ['loans', 'review', loanId, 'document-remarks'] as const,

  documentChecklist: (loanId: number) =>
    ['loans', 'review', loanId, 'document-checklist'] as const,

  group: (groupNo: string) => ['loans', 'group', groupNo] as const,

  revisionRequests: (id: number) =>
    ['loans', id, 'revision-requests'] as const,

  desk: ['loans', 'desk'] as const,
} as const

export const webLoanKeys = {
  cis: (cisNo: string) => ['webloans', 'cis', cisNo] as const,
  activeLoans: (cisNo: string, accountId: string) =>
    ['webloans', 'active-loans', cisNo, accountId] as const,

  outstandingLoans: (cisNo: string, accountId: string) =>
    ['webloans', 'outstanding-loans', cisNo, accountId] as const,
  pendingLoan: (cisNo: string, accountId: string) =>
    ['webloans', 'pending-loan', cisNo, accountId] as const,

  loanClass: (bch: string, loanNo: string, loanProduct: string) =>
    ['webloans', 'loan-class', bch, loanNo, loanProduct] as const,

  cocreeStatus: (cisNo: string) =>
    ['webloans', 'cocree-status', cisNo] as const,
} as const

export const loanStatusKeys = {
  all: ['loan-statuses'] as const,
  list: () => ['loan-statuses', 'list'] as const,
} as const
