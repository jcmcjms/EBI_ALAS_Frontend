/**
 * Workflow settings page — thin shell.
 */

import { AppShell } from "@/src/components/layout/AppShell";
import { WorkflowSettingsContent } from "./workflow-settings-content";

export function WorkflowSettingsPage() {
    return (
        <AppShell>
            <WorkflowSettingsContent />
        </AppShell>
    );
}
