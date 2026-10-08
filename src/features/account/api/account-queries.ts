export const accountKeys = {
  all: ['account'] as const,
  profile: ['account-profile'] as const,
  sessionsAll: ['account-sessions'] as const,
  sessions: (page: number, pageSize: number) =>
    ['account-sessions', page, pageSize] as const,
  activity: (limit: number) => ['account-activity', limit] as const,
  loans: (limit: number) => ['account-loans', limit] as const,
  clients: (limit: number) => ['account-clients', limit] as const,
} as const
