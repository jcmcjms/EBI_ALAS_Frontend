export function maskEmployeeId(id: string): string {
  if (!id) return '—'
  if (id.length <= 4) return id
  return `${id.slice(0, 3)}***${id.slice(-4)}`
}
