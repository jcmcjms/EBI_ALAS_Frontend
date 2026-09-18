export const ACCOUNT_TABS = ["overview", "security", "activity", "my-applications"] as const;

export type AccountTab = (typeof ACCOUNT_TABS)[number];

/** Unknown / missing `?tab=` values fall back to Overview rather than erroring. */
export function parseAccountTab(raw: string | null): AccountTab {
    return ACCOUNT_TABS.find((tab) => tab === raw) ?? "overview";
}
