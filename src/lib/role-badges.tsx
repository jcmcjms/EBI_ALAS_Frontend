import { Badge } from "@/src/components/ui/badge";

export const ROLE_BADGE_CLASS: Record<string, string> = {
    Encoder:
        "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400",
    Recommender:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    Evaluator:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
    Approver:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
    Admin:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
};

export function RoleBadge({ role }: { role: string }) {
    return (
        <Badge
            variant="outline"
            className={`text-[10px] ${ROLE_BADGE_CLASS[role] ?? ""}`}
        >
            {role}
        </Badge>
    );
}
