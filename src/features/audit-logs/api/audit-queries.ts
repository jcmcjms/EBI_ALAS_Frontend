export const auditLogKeys = {
  all: ['auditLogs'] as const,
  list: <T extends object>(params: T) =>
    ['auditLogs', 'list', params] as const,
  detail: (id: string) => ['auditLogs', 'detail', id] as const,
} as const
