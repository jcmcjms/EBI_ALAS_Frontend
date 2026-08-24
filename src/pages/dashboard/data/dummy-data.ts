import type { PendingQueueItem, NowServingItem, PushBackItem, ApprovedLoanItem, DashboardSummary } from "../types";

export const dashboardSummary: DashboardSummary = {
    totalPending: 42,
    nowServing: 8,
    pushBacksToday: 14,
    approvedToday: 27,
};

export const pendingQueueData: PendingQueueItem[] = [
    { position: 1, lamId: "LAM-849302", branch: "Surigao City", status: "On Going", date: "2026-08-24 08:15 AM" },
    { position: 2, lamId: "LAM-849305", branch: "Trento", status: "For Disbursement", date: "2026-08-24 08:30 AM" },
    { position: 3, lamId: "LAM-849310", branch: "Mati", status: "Disbursed", date: "2026-08-24 09:00 AM" },
    { position: 4, lamId: "LAM-849312", branch: "Bayugan", status: "For Checking", date: "2026-08-24 09:15 AM" },
    { position: 5, lamId: "LAM-849315", branch: "Nabunturan", status: "For Approval", date: "2026-08-24 09:45 AM" },
    { position: 6, lamId: "LAM-849318", branch: "Iloilo", status: "For Approval", date: "2026-08-24 10:00 AM" },
];

export const nowServingData: NowServingItem[] = [
    { number: 1, checker: "Danilo Santos", lamId: "LAM-849290" },
    { number: 2, checker: "Maria Dimaculangan", lamId: "LAM-849291" },
    { number: 3, checker: "Reynaldo Cruz", lamId: "LAM-849292" },
    { number: 4, checker: "Alab Dela Cruz", lamId: "LAM-849293" },
    { number: 5, checker: "Tala Mendoza", lamId: "LAM-849294" },
];

export const pushBackData: PushBackItem[] = [
    { number: 1, lamId: "LAM-849100", branch: "Lianga", date: "2026-08-24 07:45 AM" },
    { number: 2, lamId: "LAM-849105", branch: "Tagum", date: "2026-08-24 08:10 AM" },
    { number: 3, lamId: "LAM-849112", branch: "Tacloban", date: "2026-08-24 08:35 AM" },
    { number: 4, lamId: "LAM-849118", branch: "Panabo", date: "2026-08-24 09:05 AM" },
    { number: 5, lamId: "LAM-849125", branch: "Buhangin", date: "2026-08-24 09:30 AM" },
];

export const approvedLoansData: ApprovedLoanItem[] = [
    { branch: "Gen Santos", lamId: "LAM-848900", date: "2026-08-24 08:00 AM", fullName: "Bayani Castro" },
    { branch: "Talisay", lamId: "LAM-848905", date: "2026-08-24 08:45 AM", fullName: "Marisol Dimagiba" },
    { branch: "Hinatuan", lamId: "LAM-848910", date: "2026-08-24 09:15 AM", fullName: "Lualhati Aquino" },
    { branch: "Matina", lamId: "LAM-848912", date: "2026-08-24 09:50 AM", fullName: "Kidlat Reyes" },
    { branch: "Cateel", lamId: "LAM-848915", date: "2026-08-24 10:10 AM", fullName: "Amihan Santos" },
];