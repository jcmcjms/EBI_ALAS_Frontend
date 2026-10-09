/**
 * AppShell server-side data (presence, notifications, SignalR) is only allowed
 * after the forced password-change gate is cleared — matching MustChangePasswordGate.
 */
export function shouldSyncShellData(
  user: { mustChangePassword: boolean } | null | undefined,
): boolean {
  return user != null && !user.mustChangePassword
}
