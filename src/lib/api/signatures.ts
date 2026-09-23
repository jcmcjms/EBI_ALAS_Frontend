import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/src/lib/apiClient";
import { unwrapApiData, type ApiResponse } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

/** One signature line on page 2 of the Loan Approval Form. */
export interface SignatureSlotDto {
    order: number;
    action: string;
    role: string;
    jobTitle: string;
    signedByName: string | null;
    signedByJobTitle: string | null;
    signedAt: string | null;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const signatureKeys = {
    chain: ["workflow", "signature-chain"] as const,
    loan: (loanId: number) => ["loans", loanId, "signature-chain"] as const,
};

// ─── API functions ───────────────────────────────────────────────────────────

export async function getSignatureChain(): Promise<SignatureSlotDto[]> {
    const res = await apiClient.get<ApiResponse<SignatureSlotDto[]>>(
        "/api/workflow/signature-chain"
    );
    return unwrapApiData(res.data);
}

export async function getLoanSignatureChain(
    loanId: number
): Promise<SignatureSlotDto[]> {
    const res = await apiClient.get<ApiResponse<SignatureSlotDto[]>>(
        `/api/loans/${loanId}/signature-chain`
    );
    return unwrapApiData(res.data);
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Reference data — changes only when ops flips the recommendation flag. */
export function useSignatureChain() {
    return useQuery({
        queryKey: signatureKeys.chain,
        queryFn: getSignatureChain,
        staleTime: 3_600_000,
    });
}

export function useLoanSignatureChain(loanId?: number) {
    return useQuery({
        queryKey: signatureKeys.loan(loanId ?? 0),
        queryFn: () => getLoanSignatureChain(loanId!),
        enabled: Number.isFinite(loanId) && (loanId ?? 0) > 0,
        staleTime: 60_000,
    });
}

// ─── Draft helpers ───────────────────────────────────────────────────────────

interface DraftUser {
    firstName: string;
    middleName: string;
    lastName: string;
    jobTitle: string | null;
}

/** Bank-form convention: "LAST, FIRST M." in caps under the signature line. */
function draftEncoderName(user: DraftUser): string {
    const parts = [user.lastName, user.firstName, user.middleName].filter(Boolean);
    return parts.join(", ").toUpperCase();
}

/**
 * Draft preview has no LoanActions yet, but the "Prepared by" block must still
 * identify the encoding officer (name + job title from the JWT session).
 * signedAt stays null so the date line prints blank until submission.
 */
export function withDraftEncoder(
    slots: SignatureSlotDto[],
    user: DraftUser | null
): SignatureSlotDto[] {
    if (!user) return slots;
    return slots.map((s) =>
        s.role === "Encoder" && !s.signedByName
            ? {
                  ...s,
                  signedByName: draftEncoderName(user),
                  signedByJobTitle: user.jobTitle || s.jobTitle,
              }
            : s
    );
}
