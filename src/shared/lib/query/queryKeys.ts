/**
 * Domain-neutral query keys plus cross-feature cache roots.
 * Keys for a feature-owned resource live in that feature's `api/*-queries.ts`.
 */
export const queryKeys = {
  branches: {
    all: ['branches'] as const,
    list: (params: { isActive?: boolean; search?: string } = {}) =>
      ['branches', 'list', params] as const,
    detail: (id: number) => ['branches', 'detail', id] as const,
  },

  me: ['auth', 'me'] as const,

  /**
   * Root of the dashboard cache family (owned by `features/dashboard`).
   * Exported so other features can invalidate the family without importing
   * a feature module. Must stay aligned with `dashboardKeys.full`.
   */
  dashboardRoot: ['dashboard'] as const,
} as const
