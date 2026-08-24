import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { LoanMonitoringRecord, MonitoringFilters } from "@/pages/loans/monitoring/types";

interface PaginationState { pageIndex: number; pageSize: number; }
interface SortingState { id: string; desc: boolean; }

// ── Philippine names & branches for realistic dummy data ───────
const branches = [
    "Davao Main", "Tagum", "Panabo", "Digos", "Mati",
    "General Santos", "Koronadal", "Tacurong", "Cotabato", "Bukidnon",
];

const firstNames = ["Maria", "Juan", "Rose", "Jose", "Ana", "Pedro", "Liza", "Miguel", "Carmen", "Ricardo", "Grace", "Fernando", "Elena", "Roberto", "Teresa"];
const lastNames = ["Santos", "Reyes", "Cruz", "Garcia", "Mendoza", "Torres", "Ramos", "Rivera", "Gonzales", "Aquino", "Delgado", "Castillo", "Fernandez", "Lopez", "Pascual"];

const products = ["Executive Salary Loan", "Regular Salary Loan", "Multi-Purpose Loan", "Calamity Loan", "Educational Loan"];
const clientTypes = ["Government", "Private", "OFW", "Senior Citizen"];
const approvers = ["E. Rodriguez", "M. Tan", "R. Bautista", "J. Villanueva", "S. Lim", "A. Soriano"];

function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function generateDummyLoans(): LoanMonitoringRecord[] {
    const rand = seededRandom(42);
    const statuses: Array<LoanMonitoringRecord["status"]> = [
        "Draft", "Pending", "Under Review", "Approved", "Rejected", "Disbursed",
    ];

    return Array.from({ length: 1245 }, (_, i) => {
        const daysBack = Math.floor(rand() * 90);
        const appDate = new Date();
        appDate.setDate(appDate.getDate() - daysBack);
        appDate.setHours(Math.floor(rand() * 14) + 7, Math.floor(rand() * 60));

        const lastActionDaysBack = Math.floor(rand() * 30);
        const lastAction = new Date();
        lastAction.setDate(lastAction.getDate() - lastActionDaysBack);
        lastAction.setHours(Math.floor(rand() * 14) + 7, Math.floor(rand() * 60));

        const hours = Math.round((Date.now() - lastAction.getTime()) / 3_600_000);

        const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

        return {
            formNumber: `LF-${appDate.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
            branchCode: pick(branches),
            customerName: `${pick(firstNames)} ${pick(lastNames)}`,
            clientType: pick(clientTypes),
            product: pick(products),
            loanAmount: Math.round((rand() * 450_000 + 50_000) / 1_000) * 1_000,
            applicationDate: appDate.toISOString(),
            status: pick(statuses),
            lastActionDate: lastAction.toISOString(),
            timeLapsedHours: hours,
            lastApprover: pick(approvers),
        };
    });
}

// Generate once at module level (stable reference)
const ALL_LOANS = generateDummyLoans();

export function useLoanMonitoring(
    filters: MonitoringFilters,
    pagination: PaginationState,
    sorting: SortingState[]
) {
    return useQuery({
        queryKey: ["loan-monitoring", filters, pagination, sorting],
        queryFn: async () => {
            // Simulate network latency
            await new Promise((r) => setTimeout(r, 300));

            let filtered = [...ALL_LOANS];

            // Search
            if (filters.search) {
                const q = filters.search.toLowerCase();
                filtered = filtered.filter(
                    (r) =>
                        r.formNumber.toLowerCase().includes(q) ||
                        r.customerName.toLowerCase().includes(q) ||
                        r.product.toLowerCase().includes(q)
                );
            }

            // Status
            if (filters.status.length > 0) {
                filtered = filtered.filter((r) => filters.status.includes(r.status as any));
            }

            // Branch
            if (filters.branchCode && filters.branchCode !== "all") {
                filtered = filtered.filter((r) => r.branchCode === filters.branchCode);
            }

            // Sorting
            if (sorting.length > 0) {
                const { id, desc } = sorting[0];
                filtered.sort((a: any, b: any) => {
                    const av = a[id];
                    const bv = b[id];
                    if (av < bv) return desc ? 1 : -1;
                    if (av > bv) return desc ? -1 : 1;
                    return 0;
                });
            }

            // Pagination
            const start = pagination.pageIndex * pagination.pageSize;
            const paged = filtered.slice(start, start + pagination.pageSize);

            return { data: paged, rowCount: filtered.length };
        },
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5,
    });
}
