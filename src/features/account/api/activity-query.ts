export type ActivityFilters = {
  from?: string
  to?: string
  action?: string
}

export function buildActivityQuery(
  limit: number,
  filters: ActivityFilters,
): string {
  const params = new URLSearchParams({ limit: String(limit) })
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.action) params.set('action', filters.action)
  return params.toString()
}
