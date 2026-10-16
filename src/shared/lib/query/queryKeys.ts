
export const queryKeys = {
  branches: {
    all: ['branches'] as const,
    list: (params: { isActive?: boolean; search?: string } = {}) =>
      ['branches', 'list', params] as const,
    detail: (id: number) => ['branches', 'detail', id] as const,
  },

  me: ['auth', 'me'] as const,

  
  dashboardRoot: ['dashboard'] as const,
} as const
