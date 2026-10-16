
export function shouldSyncShellData(
  user: { mustChangePassword: boolean } | null | undefined,
): boolean {
  return user != null && !user.mustChangePassword
}
