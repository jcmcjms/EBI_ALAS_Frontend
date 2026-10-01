export const queryKeys = {
  branches: {
    all: ['branches'] as const,
    list: (params: { isActive?: boolean; search?: string } = {}) =>
      ['branches', 'list', params] as const,
    detail: (id: number) => ['branches', 'detail', id] as const,
  },
  loanProducts: {
    all: ['loan-products'] as const,
    list: (params: { isActive?: boolean; code?: string } = {}) =>
      ['loan-products', 'list', params] as const,

    detail: (code: string) => ['loan-products', 'detail', code] as const,
  },
  loanStatuses: {
    all: ['loan-statuses'] as const,
    list: () => ['loan-statuses', 'list'] as const,
  },

  me: ['auth', 'me'] as const,

  roles: {
    all: ['roles'] as const,
  },

  users: {
    all: ['users'] as const,

    list: <T extends object>(params: T) => ['users', 'list', params] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
    stats: () => ['users', 'stats'] as const,
    auditLog: (id: number) => ['users', id, 'audit-log'] as const,
  },

  loans: {
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

    desk: ['loans', 'desk'] as const,
  },

  webLoans: {
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
  },

  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    full: ['dashboard'] as const,
  },

  auditLogs: {
    all: ['auditLogs'] as const,
    list: <T extends object>(params: T) =>
      ['auditLogs', 'list', params] as const,
    detail: (id: number) => ['auditLogs', 'detail', id] as const,
  },

  account: {
    all: ['account'] as const,
    profile: ['account-profile'] as const,
    sessionsAll: ['account-sessions'] as const,
    sessions: (page: number, pageSize: number) =>
      ['account-sessions', page, pageSize] as const,
    activity: (limit: number) => ['account-activity', limit] as const,
    loans: (limit: number) => ['account-loans', limit] as const,
    clients: (limit: number) => ['account-clients', limit] as const,
  },

  notifications: ['notifications'] as const,
} as const
