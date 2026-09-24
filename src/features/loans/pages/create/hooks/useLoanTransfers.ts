/**
 * useLoanTransfers
 * ----------------
 * Centralized state-management hook for the four loan sections shown in
 * the loan creation wizard (Outstanding, EBI Reloans, Buy-Outs,
 * Incoming).
 *
 * ── Single-instance contract ─────────────────────────────────────
 * Outstanding Loans keeps a real `useFieldArray` (static name, mounted
 * once for the form's lifetime). The three per-loan arrays (EBI,
 * Buy-Outs, Incoming) are ordinary form paths: rows render controlled
 * from form state and mutate via `setValue`, which removes the "one
 * useFieldArray per name" constraint that previously forced a keyed
 * remount of the whole form.
 *
 * ── Active-loan scoping ──────────────────────────────────────────
 * The EBI, BuyOut, and Incoming form paths are scoped to the active
 * loan's index (`loans.{idx}.ebiReloans`, etc.).
 *
 * ── Bidirectional transfer contract ───────────────────────────────────
 * Reclassification is strictly bidirectional and only between
 * `outstanding` and `ebi`:
 *
 *   • `outstanding`  ↔  `ebi`     ← allowed
 *   • `outstanding`  →  `buyout`  ← rejected
 *   • `outstanding`  →  `incoming`← rejected
 *   • any path involving `buyout` / `incoming` ← rejected
 *
 * `buyout` and `incoming` rows are managed directly by the AO via
 * Add/Delete buttons in the section-5 table; they are no longer
 * destinations for outstanding rows.
 *
 * ── Transfer keying ──────────────────────────────────────────────
 * Transfers now use **row index** (not RHF field-id). This is safe
 * because every input is now controlled (renders from form state each
 * render), so a splice can't leave a stale uncontrolled DOM value
 * behind.
 */

import { useCallback } from "react";
import { useFieldArray, useFormContext, type Control, type FieldPath } from "react-hook-form";
import { toastSuccess, toastError } from "@/src/components/ui/toast";

import {
    LOAN_SECTION_LABELS,
    mapToEbi,
    mapToOutstanding,
    type TransferSourceRow,
} from "../utils/loan-transfer-utils";
import type { LoanApplicationFormData, OutstandingLoan } from "../schema";

export type PerLoanArrayKind = "ebiReloans" | "buyOuts" | "incomingLoans";

type ArrayPath = FieldPath<LoanApplicationFormData>;

const normalize = (v: unknown): TransferSourceRow =>
    typeof v === "object" && v !== null ? (v as TransferSourceRow) : {};

/**
 * Outstanding Loans keeps a real useFieldArray (static name, mounted once
 * for the form's lifetime). The three per-loan arrays are ordinary form
 * paths: rows render controlled from form state and mutate via setValue,
 * which removes the "one useFieldArray per name" constraint that previously
 * forced a keyed remount of the whole form.
 */
export function useLoanTransfers(activeLoanIndex: number | null) {
    const { control, getValues, setValue } = useFormContext<LoanApplicationFormData>();

    const outstanding = useFieldArray({ control, name: "outstandingLoans" });

    const arrayPath = (index: number, kind: PerLoanArrayKind) =>
        `loans.${index}.${kind}` as ArrayPath;

    const getRows = <T,>(index: number, kind: PerLoanArrayKind): T[] =>
        (getValues(arrayPath(index, kind)) as T[] | undefined) ?? [];

    const setRows = (index: number, kind: PerLoanArrayKind, next: unknown[]) =>
        setValue(arrayPath(index, kind), next as never, { shouldDirty: true });

    const requireActive = (): number | null => {
        if (activeLoanIndex === null) {
            toastError("Select a loan number in Step 1.3 before adding obligations.");
            return null;
        }
        return activeLoanIndex;
    };

    const appendRow = useCallback(
        (kind: PerLoanArrayKind, row: unknown) => {
            const index = requireActive();
            if (index === null) return;
            setRows(index, kind, [...getRows(index, kind), row]);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeLoanIndex]
    );

    const removeRow = useCallback(
        (kind: PerLoanArrayKind, rowIndex: number) => {
            const index = requireActive();
            if (index === null) return;
            setRows(index, kind, getRows(index, kind).filter((_, i) => i !== rowIndex));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeLoanIndex]
    );

    /**
     * Bidirectional Outstanding ↔ EBI(active loan) transfer, index-based.
     * Indices are safe here: both sides read their row data from the same
     * render's form state, and every input is controlled (renders from
     * form state each render), so a splice can't leave a stale uncontrolled
     * DOM value behind.
     */
    const handleTransfer = useCallback(
        (source: "outstanding" | "ebi", rowIndex: number, target: "outstanding" | "ebi") => {
            if (source === target) return;

            if (target === "ebi" && activeLoanIndex === null) {
                toastError("Select a loan number in Step 1.3 before transferring to EBI accounts.");
                return;
            }

            if (source === "outstanding") {
                const live = (getValues("outstandingLoans") as OutstandingLoan[] | undefined) ?? [];
                const rowData = live[rowIndex];
                if (!rowData) {
                    toastError("Could not transfer loan — source row not found.");
                    return;
                }
                const mapped = mapToEbi(normalize(rowData), "outstanding");
                const targetIndex = activeLoanIndex as number;
                setRows(targetIndex, "ebiReloans", [...getRows(targetIndex, "ebiReloans"), mapped]);
                outstanding.remove(rowIndex);
            } else {
                const sourceIndex = activeLoanIndex as number;
                const live = getRows<TransferSourceRow>(sourceIndex, "ebiReloans");
                const rowData = live[rowIndex];
                if (!rowData) {
                    toastError("Could not transfer loan — source row not found.");
                    return;
                }
                const mapped = mapToOutstanding(normalize(rowData), "ebi");
                setRows(sourceIndex, "ebiReloans", live.filter((_, i) => i !== rowIndex));
                outstanding.append(mapped as never, { shouldFocus: false });
            }

            toastSuccess(`Transferred loan to ${LOAN_SECTION_LABELS[target === "ebi" ? "ebi" : "outstanding"]}`);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeLoanIndex, outstanding]
    );

    return {
        outstanding,
        activeLoanIndex,
        getRows,
        appendRow,
        removeRow,
        handleTransfer,
        control: control as Control<LoanApplicationFormData>,
    };
}
