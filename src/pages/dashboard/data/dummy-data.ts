import type { PendingQueueItem, NowServingItem, PushBackItem, ApprovedLoanItem, DashboardSummary } from "../types";

export const dashboardSummary: DashboardSummary = {
    totalPending: 42,
    nowServing: 8,
    pushBacksToday: 14,
    approvedToday: 27,
};

export const pendingQueueData: PendingQueueItem[] = [
    { position: 1, lamId: "LAM-849302", branch: "Makati Main", status: "On Going", date: "2026-08-24 08:15 AM" },
    { position: 2, lamId: "LAM-849305", branch: "BGC Branch", status: "For Disbursement", date: "2026-08-24 08:30 AM" },
    { position: 3, lamId: "LAM-849310", branch: "Ortigas Center", status: "Disbursed", date: "2026-08-24 09:00 AM" },
    { position: 4, lamId: "LAM-849312", branch: "Quezon City", status: "For Checking", date: "2026-08-24 09:15 AM" },
    { position: 5, lamId: "LAM-849315", branch: "Alabang", status: "For Approval", date: "2026-08-24 09:45 AM" },
    { position: 6, lamId: "LAM-849318", branch: "Pasig", status: "For Approval", date: "2026-08-24 10:00 AM" },
];

export const nowServingData: NowServingItem[] = [
    { number: 1, checker: "Maria Santos", lamId: "LAM-849290" },
    { number: 2, checker: "Juan Dela Cruz", lamId: "LAM-849291" },
    { number: 3, checker: "Ana Reyes", lamId: "LAM-849292" },
    { number: 4, checker: "Pedro Penduko", lamId: "LAM-849293" },
    { number: 5, checker: "Rizal Mercado", lamId: "LAM-849294" },
];

export const pushBackData: PushBackItem[] = [
    { number: 1, lamId: "LAM-849100", branch: "Makati Main", date: "2026-08-24 07:45 AM" },
    { number: 2, lamId: "LAM-849105", branch: "BGC Branch", date: "2026-08-24 08:10 AM" },
    { number: 3, lamId: "LAM-849112", branch: "Ortigas Center", date: "2026-08-24 08:35 AM" },
    { number: 4, lamId: "LAM-849118", branch: "Alabang", date: "2026-08-24 09:05 AM" },
    { number: 5, lamId: "LAM-849125", branch: "Pasig", date: "2026-08-24 09:30 AM" },
];

export const approvedLoansData: ApprovedLoanItem[] = [
    { branch: "Makati Main", lamId: "LAM-848900", date: "2026-08-24 08:00 AM", fullName: "Jose P. Rizal" },
    { branch: "BGC Branch", lamId: "LAM-848905", date: "2026-08-24 08:45 AM", fullName: "Andres B." },
    { branch: "Ortigas Center", lamId: "LAM-848910", date: "2026-08-24 09:15 AM", fullName: "Gabriela S." },
    { branch: "Quezon City", lamId: "LAM-848912", date: "2026-08-24 09:50 AM", fullName: "Apolinario M." },
    { branch: "Alabang", lamId: "LAM-848915", date: "2026-08-24 10:10 AM", fullName: "Melchora A." },
];