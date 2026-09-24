/**
 * Account feature entry point — wraps the page in the app shell.
 */

import { AppShell } from "@/src/components/layout/AppShell";
import { AccountPage } from "./account-page";

export default function AccountIndex() {
    return (
        <AppShell>
            <AccountPage />
        </AppShell>
    );
}
