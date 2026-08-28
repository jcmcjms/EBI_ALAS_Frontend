import type { PendingQueueItem, NowServingItem, PushBackItem, ApprovedLoanItem, DashboardSummary, WeeklyTrendPoint } from "../types";

// Relative timestamps so the dashboard always reads as "now".
// TODO(api): replace with React Query fetches; keep these view models.
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

export const dashboardSummary: DashboardSummary = {
    totalPending: 42,
    nowServing: 8,
    pushBacksToday: 14,
    approvedToday: 27,
};

export const pendingQueueData: PendingQueueItem[] = [
    { position: 1, lamId: "LAM-849302", branch: "Surigao City", status: "On Going", date: minutesAgo(195) },
    { position: 2, lamId: "LAM-849305", branch: "Trento", status: "For Disbursement", date: minutesAgo(160) },
    { position: 3, lamId: "LAM-849310", branch: "Mati", status: "Disbursed", date: minutesAgo(130) },
    { position: 4, lamId: "LAM-849312", branch: "Bayugan", status: "For Checking", date: minutesAgo(95) },
    { position: 5, lamId: "LAM-849315", branch: "Nabunturan", status: "For Approval", date: minutesAgo(50) },
    { position: 6, lamId: "LAM-849318", branch: "Iloilo", status: "For Approval", date: minutesAgo(25) },
];

export const nowServingData: NowServingItem[] = [
    { number: 1, checker: "Danilo Santos", lamId: "LAM-849290" },
    { number: 2, checker: "Maria Dimaculangan", lamId: "LAM-849291" },
    { number: 3, checker: "Reynaldo Cruz", lamId: "LAM-849292" },
    { number: 4, checker: "Alab Dela Cruz", lamId: "LAM-849293" },
    { number: 5, checker: "Tala Mendoza", lamId: "LAM-849294" },
];

export const pushBackData: PushBackItem[] = [
    { number: 1, lamId: "LAM-849100", branch: "Lianga", date: minutesAgo(210), reason: "Missing COE" },
    { number: 2, lamId: "LAM-849105", branch: "Tagum", date: minutesAgo(175), reason: "DTI exceeds 40%" },
    { number: 3, lamId: "LAM-849112", branch: "Tacloban", date: minutesAgo(140), reason: "Unsigned documents" },
    { number: 4, lamId: "LAM-849118", branch: "Panabo", date: minutesAgo(85), reason: "CIS name mismatch" },
    { number: 5, lamId: "LAM-849125", branch: "Buhangin", date: minutesAgo(30), reason: "Missing co-maker" },
];

export const approvedLoansData: ApprovedLoanItem[] = [
    { branch: "Gen Santos", lamId: "LAM-848900", date: minutesAgo(200), fullName: "Bayani Castro" },
    { branch: "Talisay", lamId: "LAM-848905", date: minutesAgo(155), fullName: "Marisol Dimagiba" },
    { branch: "Hinatuan", lamId: "LAM-848910", date: minutesAgo(125), fullName: "Lualhati Aquino" },
    { branch: "Matina", lamId: "LAM-848912", date: minutesAgo(90), fullName: "Kidlat Reyes" },
    { branch: "Cateel", lamId: "LAM-848915", date: minutesAgo(40), fullName: "Amihan Santos" },
];

export const weeklyTrend: WeeklyTrendPoint[] = [
    { day: "Mon", approved: 18, pushBacks: 9 },
    { day: "Tue", approved: 22, pushBacks: 7 },
    { day: "Wed", approved: 19, pushBacks: 11 },
    { day: "Thu", approved: 25, pushBacks: 6 },
    { day: "Fri", approved: 27, pushBacks: 14 },
    { day: "Sat", approved: 12, pushBacks: 4 },
    { day: "Sun", approved: 0, pushBacks: 0 },
];