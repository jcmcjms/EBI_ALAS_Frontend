/** Two-letter avatar initials from a display name; fallback for empty names. */
export function initialsOf(name: string | null | undefined): string {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
    return initials || "\u2014";
}
