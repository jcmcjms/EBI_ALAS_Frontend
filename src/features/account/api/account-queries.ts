export const accountKeys = {
  all: ['account'] as const,
  profile: ['account-profile'] as const,
  sessionsAll: ['account-sessions'] as const,
  sessions: (page: number, pageSize: number) =>
    ['account-sessions', page, pageSize] as const,
  activity: (limit: number, filters: { from?: string; to?: string; action?: string }) =>
    ['account-activity', limit, filters.from ?? '', filters.to ?? '', filters.action ?? ''] as const,
  loans: (limit: number) => ['account-loans', limit] as const,
  clients: (limit: number) => ['account-clients', limit] as const,
} as const
