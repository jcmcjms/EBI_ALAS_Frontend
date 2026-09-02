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
 *
 * The hook enforces this contract as a defense-in-depth check, so any
 * caller that bypasses the UI is still rejected with a clear toast
 * rather than silently corrupting form state.
 *
 * ── Why we identify rows by `id`, not array index ──────────────────────
 * In react-hook-form, the array index returned by `useFieldArray`'s
 * `fields` and the array index returned by `useWatch` on the same path
 * can desync whenever the form state is mutated (e.g. when an `append`
 * is followed by a `remove`, or when RHF normalizes a `default([])`
 * array). Passing a positional index from a `useWatch` map back into
 * `sourceArray.fields[index]` then produces `undefined` and the
 * transfer silently fails with "source row not found".
 *
 * The correct identity for a `useFieldArray` row is its RHF-generated
 * `id` field. So `handleTransfer` accepts an `id`, and we look up the
 * matching field by id before doing the `remove`. The mapping is done
 * against the watched value (the source of truth for the row's *data*),
 * not against the `fields` snapshot, which avoids the index mismatch
 * entirely.
 *
 * ── Why we append *then* remove ─────────────────────────────────────────
 * Reversing the order would briefly leave the source row visible while
 * the target is being updated, which can race with the `useWatch`
 * re-render in the source table and produce a flicker (and in some RHF
 * versions, a duplicated-key React warning). Append first, remove
 * second: both happen synchronously in the same microtask, so the user
 * only ever sees the row in its new section.
 */

import { useCallback } from "react";
import { useFieldArray, useFormContext, type Control } from "react-hook-form";
import { toast } from "sonner";

import {
    LOAN_SECTION_LABELS,
    mapToEbi,
    mapToOutstanding,
    type LoanSection,
} from "../utils/loan-transfer-utils";
import type { LoanApplicationFormData } from "../schema";

type LoanArrays = {
    outstanding: ReturnType<typeof useFieldArray<LoanApplicationFormData, "outstandingLoans">>;
    ebi: ReturnType<typeof useFieldArray<LoanApplicationFormData, "ebiReloans">>;
    buyOut: ReturnType<typeof useFieldArray<LoanApplicationFormData, "buyOuts">>;
    incoming: ReturnType<typeof useFieldArray<LoanApplicationFormData, "incomingLoans">>;
};

export function useLoanTransfers() {
    // The form context is provided by <FormProvider> in loan-creation.tsx.
    // We still ask for it through `useFormContext` so that consumers
    // (components) don't have to know how the form is wired.
    const { control, getValues } = useFormContext<LoanApplicationFormData>();

    const outstanding = useFieldArray({ control, name: "outstandingLoans" });
    const ebi = useFieldArray({ control, name: "ebiReloans" });
    const buyOut = useFieldArray({ control, name: "buyOuts" });
    const incoming = useFieldArray({ control, name: "incomingLoans" });

    const arrays: LoanArrays = { outstanding, ebi, buyOut, incoming };

    /**
     * Internal lookup that maps a public `LoanSection` ("buyout") to the
     * camelCase key used by `arrays` ("buyOut"). Keeping this as a
     * `Record` rather than a function makes call-sites self-documenting.
     */
    const sectionToArray: Record<LoanSection, keyof LoanArrays> = {
        outstanding: "outstanding",
        ebi: "ebi",
        buyout: "buyOut",
        incoming: "incoming",
    };

    /**
     * The same mapping but for the form-state path used by `getValues`
     * and `useWatch`. The `useFieldArray` `name` and the form-state path
     * are identical for our four sections, but we keep the indirection
     * so the schema can rename a path later without touching call-sites.
     */
    const sectionToPath: Record<LoanSection, "outstandingLoans" | "ebiReloans" | "buyOuts" | "incomingLoans"> = {
        outstanding: "outstandingLoans",
        ebi: "ebiReloans",
        buyout: "buyOuts",
        incoming: "incomingLoans",
    };

    /**
     * Transfer the row identified by `rowId` from `source` to the end
     * of `target`. Re-mapping is delegated to the pure helpers in
     * `loan-transfer-utils`.
     *
     * @param source  The section the row currently lives in.
     * @param rowId   The RHF-generated `id` of the row to move. This is
     *                 the React key the table component uses to identify
     *                 the row, so it can never be wrong even if the
     *                 array indices desync.
     * @param target  The section to move the row into.
     */
    const handleTransfer = useCallback(
        (source: LoanSection, rowId: string, target: LoanSection): void => {
            if (source === target) return;

            // ── Enforce the bidirectional contract ───────────────────
            // Transfers are allowed only between `outstanding` and `ebi`.
            // Anything else (including transfers into `buyout` /
            // `incoming`, or transfers *out of* `buyout` / `incoming`)
            // is rejected. This is the second line of defence — the
            // `TransferActionMenu` already only offers these targets —
            // so any caller that bypasses the UI is still rejected with
            // a clear error rather than silently corrupting form state.
            const isValidTransfer =
                (source === "outstanding" && target === "ebi") ||
                (source === "ebi" && target === "outstanding");

            if (!isValidTransfer) {
                toast.error(
                    "Transfers are only allowed between Outstanding Loans and EBI Accounts.",
                );
                return;
            }

            const sourceArray = arrays[sectionToArray[source]];
            const targetArray = arrays[sectionToArray[target]];
            const sourcePath = sectionToPath[source];

            // ── Step 1: locate the row by `id` in the `useFieldArray` snapshot.
            // `fields` is the only reliable place to find the *current*
            // index for a given id, because `useFieldArray` re-derives
            // it from RHF's internal store on every render.
            const fieldIndex = sourceArray.fields.findIndex((f) => f.id === rowId);

            // ── Step 2: read the row's *data* from the live form state.
            // We use `getValues` here (synchronous) rather than `useWatch`,
            // so we are guaranteed to read the most recent committed
            // value, not whatever the current render's subscription saw.
            const liveValues = (getValues(sourcePath) as unknown[] | undefined) ?? [];

            // The row's data should sit at the same index as the field.
            // If the indices somehow desync (e.g. a stale closure during
            // a rapid double-click), we recover by searching for the
            // matching `id` in the raw values array instead.
            let rowData: unknown = liveValues[fieldIndex];

            if (rowData == null) {
                const idIndex = (liveValues as Array<{ id?: string }>).findIndex(
                    (v) => v?.id === rowId,
                );
                if (idIndex >= 0) rowData = liveValues[idIndex];
            }

            if (fieldIndex < 0 || rowData == null) {
                // Defensive: this should not be reachable in normal
                // operation, but if it ever is we want the user to
                // know rather than silently no-op.
                toast.error("Could not transfer loan — source row not found.");
                return;
            }

            // ── Step 3: map the row's data into the target schema.
            // After the bidirectional contract check above, `target` is
            // narrowed to one of {"ebi", "outstanding"}, so a `switch`
            // with exhaustiveness checking is the right shape. The
            // `never` branch makes the compiler complain if a future
            // section is ever added without being handled.
            let mappedRow: unknown;
            // Narrow target to only the valid options to satisfy TypeScript
            // exhaustiveness in the presence of `buyout` / `incoming`.
            const restrictedTarget = target as "ebi" | "outstanding";
            switch (restrictedTarget) {
                case "ebi":
                    mappedRow = mapToEbi(rowData, source);
                    break;
                case "outstanding":
                    mappedRow = mapToOutstanding(rowData, source);
                    break;
                default: {
                    const _exhaustive: never = restrictedTarget;
                    toast.error(`Unknown target section: ${String(_exhaustive)}`);
                    return;
                }
            }

            // ── Step 4: append to the target, then remove from the source.
            //
            // Order matters: appending first keeps the array lengths
            // symmetric during the React render cycle, which avoids
            // a row briefly disappearing. In react-hook-form >= 7.55
            // the mutation helpers no longer accept `shouldDirty`; the
            // form is considered dirty automatically on commit, which
            // is exactly the behaviour we want.
            targetArray.append(mappedRow as any, { shouldFocus: false });
            sourceArray.remove(fieldIndex);

            toast.success(`Transferred loan to ${LOAN_SECTION_LABELS[restrictedTarget]}`);
        },
        // The four `useFieldArray` returns are stable references per
        // render, but we list them anyway to keep the linter honest.
        [arrays, sectionToArray, sectionToPath, getValues],
    );

    return { arrays, handleTransfer, control: control as Control<LoanApplicationFormData> };
}