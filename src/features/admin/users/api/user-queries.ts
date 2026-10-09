export const userKeys = {
  all: ['users'] as const,

  list: <T extends object>(params: T) => ['users', 'list', params] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  stats: (metric: 'total' | 'active') =>
    ['users', 'stats', metric] as const,
  auditLog: (id: string) => ['users', id, 'audit-log'] as const,
} as const

export const roleKeys = {
  all: ['roles'] as const,
} as const
