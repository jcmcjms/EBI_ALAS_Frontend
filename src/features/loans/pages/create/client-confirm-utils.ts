export function isCreateFormUnlocked(
  cisId: string,
  clientConfirmed: boolean,
): boolean {
  return cisId.length > 0 && clientConfirmed
}
