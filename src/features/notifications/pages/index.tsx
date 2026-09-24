/**
 * Notifications feature entry point — wraps the page in the app shell.
 */

import { AppShell } from "@/src/components/layout/AppShell";
import { NotificationsPage } from "./notifications-page";

export default function NotificationsIndex() {
    return (
        <AppShell>
            <NotificationsPage />
        </AppShell>
    );
}
