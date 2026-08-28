import { apiClient } from "../apiClient";
import type {PagedResult} from "@/src/lib/api/types";

export interface AccountProfile {
    id: number;
    username: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    branchId: string;
    role: string;
    email?: string;
    phone?: string;
    emergencyContact?: string;
    profilePhotoUrl?: string;
    createdAt: string;
    passwordChangedAt?: string;
    stats: {
        processedLoans: number;
        pendingLoans: number;
        approvalRate: number;
    };
}

export interface Session {
    id: number;
    deviceInfo: string;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
}

export interface PagedSessionsResponse extends PagedResult<Session> {}

export interface Activity {
    id: number;
    loanFormNumber: string;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    comments?: string;
    actionDate: string;
    loanClientName: string;
}

export interface ProcessedLoan {
    id: number;
    formNumber: string;
    clientName: string;
    status: string;
    applicationDate: string;
    proposedAmount: number;
}

export interface RecentClient {
    cisId: string;
    name: string;
    agency: string;
    lastInteraction: string;
}

export async function getAccountProfile(): Promise<AccountProfile> {
    const response = await apiClient.get("/api/account/me");
    return response.data.data;
}

export async function updateAccountProfile(data: {
    email?: string;
    phone?: string;
    emergencyContact?: string;
}): Promise<void> {
    await apiClient.put("/api/account/me", data);
}

export async function getAccountSessions(pageNumber = 1, pageSize = 10): Promise<PagedSessionsResponse> {
    const response = await apiClient.get(`/api/account/me/sessions?pageNumber=${pageNumber}&pageSize=${pageSize}`);
    return response.data.data;
}

export async function revokeAccountSession(sessionId: number): Promise<void> {
    await apiClient.delete(`/api/account/me/sessions/${sessionId}`);
}

export async function getAccountActivity(limit = 10): Promise<Activity[]> {
    const response = await apiClient.get(`/api/account/me/activity?limit=${limit}`);
    return response.data.data;
}

export async function getAccountLoans(limit = 10): Promise<ProcessedLoan[]> {
    const response = await apiClient.get(`/api/account/me/loans?limit=${limit}`);
    return response.data.data;
}

export async function getAccountClients(limit = 5): Promise<RecentClient[]> {
    const response = await apiClient.get(`/api/account/me/clients?limit=${limit}`);
    return response.data.data;
}