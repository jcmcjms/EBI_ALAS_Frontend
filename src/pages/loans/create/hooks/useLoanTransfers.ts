/**
 * useLoanTransfers
 * ----------------
 * Centralized state-management hook for the four loan sections shown in
 * the loan creation wizard (Outstanding, EBI Reloans, Buy-Outs,
 * Incoming). It exposes the four `useFieldArray` instances as a single
 * object so any component can read or mutate any section without
 * re-subscribing locally, and provides a single `handleTransfer` action
 * that atomically moves a row from one section to another while
 * re-mapping its columns through `loan-transfer-utils`.
 *
 * ── Single-instance contract ─────────────────────────────────────
 * `useFieldArray` must be mounted ONCE per array name — react-hook-form
 * explicitly does not support multiple `useFieldArray` instances with
 * the same `name`, because each instance keeps a private `fields`
 * snapshot that is not re-synchronised when a sibling instance mutates
 * the same array. The symptom is the "transfer toast fires but the
 * target table stays empty" bug we hit three commits in a row.
 *
 * This hook is therefore only invoked by `<LoanTransfersProvider>`,
 * mounted once inside `<FormProvider>` in `loan-creation.tsx`.
 * Components obtain it via `useLoanTransfersContext()`. A second direct
 * `useLoanTransfers()` call from any component would silently desync
 * that component's render from the provider's.
 *
 * ── Active-loan scoping ──────────────────────────────────────────
 * The EBI, BuyOut, and Incoming field arrays are now scoped to the
 * active loan's index (`loans.{idx}.ebiReloans`, etc.). The provider
 * keys the bridge by `activeLoanNo` so that `useFieldArray` instances
 * are remounted when the AO switches tabs.
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
 * `buyout` and `incoming` rows are now managed directly by the AO via
 * Add/Delete buttons in the section-5 table; they are no longer
 * destinations for outstanding rows.
 */

import { useCallback } from "react";
import { useFieldArray, useFormContext, type Control, type FieldArrayPath } from "react-hook-form";
import { toastSuccess, toastError } from "@/src/components/ui/toast";

import {
    LOAN_SECTION_LABELS,
    mapToEbi,
    mapToOutstanding,
    type LoanSection,
    type TransferSourceRow,
} from "../utils/loan-transfer-utils";
import type { EbiReloan, LoanApplicationFormData, OutstandingLoan } from "../schema";

type LoanArrays = {
    outstanding: ReturnType<typeof useFieldArray<LoanApplicationFormData, "outstandingLoans">>;
    ebi: ReturnType<typeof useFieldArray<LoanApplicationFormData>>;
    buyOut: ReturnType<typeof useFieldArray<LoanApplicationFormData>>;
    incoming: ReturnType<typeof useFieldArray<LoanApplicationFormData>>;
};

/**
 * Discriminated helpers for `useFieldArray.append()` so we don't have
 * to cast at the call site.
 */
type OutstandingArray = LoanArrays["outstanding"];
type EbiArray = LoanArrays["ebi"];

export function useLoanTransfers(loanIndex: number | null) {
    const { control, getValues } = useFormContext<LoanApplicationFormData>();

    const idx = loanIndex ?? 0; // mounted-but-idle when no loan selected; all mutators guard on null

    const outstanding = useFieldArray({ control, name: "outstandingLoans" });
    const ebi = useFieldArray({ control, name: `loans.${idx}.ebiReloans` as FieldArrayPath<LoanApplicationFormData> });
    const buyOut = useFieldArray({ control, name: `loans.${idx}.buyOuts` as FieldArrayPath<LoanApplicationFormData> });
    const incoming = useFieldArray({ control, name: `loans.${idx}.incomingLoans` as FieldArrayPath<LoanApplicationFormData> });

    const arrays: LoanArrays = { outstanding, ebi, buyOut, incoming };

    const sectionToArray: Record<LoanSection, keyof LoanArrays> = {
        outstanding: "outstanding",
        ebi: "ebi",
        buyout: "buyOut",
        incoming: "incoming",
    };

    const sectionToPath: Record<LoanSection, string> = {
        outstanding: "outstandingLoans",
        ebi: `loans.${idx}.ebiReloans`,
        buyout: `loans.${idx}.buyOuts`,
        incoming: `loans.${idx}.incomingLoans`,
    };

    const handleTransfer = useCallback(
        (source: LoanSection, rowId: string, target: LoanSection): void => {
            if (source === target) return;

            // Guard: EBI transfers require an active loan
            if (loanIndex === null && target === "ebi") {
                toastError("Select a loan number in Step 1.3 before transferring to EBI accounts.");
                return;
            }

            const isValidTransfer =
                (source === "outstanding" && target === "ebi") ||
                (source === "ebi" && target === "outstanding");

            if (!isValidTransfer) {
                toastError(
                    "Transfers are only allowed between Outstanding Loans and EBI Accounts.",
                );
                return;
            }

            const sourceArray = arrays[sectionToArray[source]];
            const targetArray = arrays[sectionToArray[target]];
            const sourcePath = sectionToPath[source];

            const fieldIndex = sourceArray.fields.findIndex((f) => f.id === rowId);

            const liveValues = (getValues(sourcePath as never) as unknown[] | undefined) ?? [];

            const normalize = (v: unknown): TransferSourceRow =>
                typeof v === "object" && v !== null
                    ? (v as TransferSourceRow)
                    : {};

            let rowData: unknown = liveValues[fieldIndex];

            if (rowData == null) {
                const idIndex = (liveValues as Array<{ id?: string }>).findIndex(
                    (v) => v?.id === rowId,
                );
                if (idIndex >= 0) rowData = liveValues[idIndex];
            }

            if (fieldIndex < 0 || rowData == null) {
                toastError("Could not transfer loan — source row not found.");
                return;
            }

            const restrictedTarget = target as "ebi" | "outstanding";
            let mappedRow: EbiReloan | OutstandingLoan;
            switch (restrictedTarget) {
                case "ebi":
                    mappedRow = mapToEbi(normalize(rowData), source);
                    break;
                case "outstanding":
                    mappedRow = mapToOutstanding(normalize(rowData), source);
                    break;
                default: {
                    const _exhaustive: never = restrictedTarget;
                    toastError(`Unknown target section: ${String(_exhaustive)}`);
                    return;
                }
            }

            if (restrictedTarget === "ebi") {
                (targetArray as EbiArray).append(
                    mappedRow as EbiReloan,
                    { shouldFocus: false }
                );
            } else {
                (targetArray as OutstandingArray).append(
                    mappedRow as OutstandingLoan,
                    { shouldFocus: false }
                );
            }
            sourceArray.remove(fieldIndex);

            toastSuccess(`Transferred loan to ${LOAN_SECTION_LABELS[restrictedTarget]}`);
        },
        [loanIndex, arrays, sectionToArray, sectionToPath, getValues],
    );

    return { arrays, handleTransfer, control: control as Control<LoanApplicationFormData> };
}
