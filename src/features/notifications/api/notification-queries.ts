export const notificationKeys = {
  all: ['notifications'] as const,
  inbox: <T extends object>(params: T) =>
    ['notifications', 'inbox', params] as const,
} as const
