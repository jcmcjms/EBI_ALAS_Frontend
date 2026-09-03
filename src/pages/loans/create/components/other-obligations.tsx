/**
 * OtherObligationsSection
 * -----------------------
 * Section 5 of the loan creation wizard. Renders three tables:
 *
 *   1. EBI Accounts for Reloans  — read-only rows populated via
 *      transfers from Outstanding Loans. Each row exposes a transfer
 *      menu so it can be moved back to Outstanding.
 *
 *   2. Buy-Out Accounts (Other FIs) — manually managed by the AO. The
 *      user adds rows via "Add Account", edits the inputs directly,
 *      and deletes rows via the trash icon.
 *
 *   3. Incoming / Undeducted Loans — same manual add / edit / delete
 *      pattern as Buy-Outs, triggered by "Add Loan".
 *
 * Visual contract:
 *   • `bg-muted/50` + `readOnly` on the EBI rows signals to the user
 *     that those rows are populated via transfers (not direct entry),
 *     and contrasts visually with the standard inputs in the manual
 *     grids below.
 *   • Phosphor icons are used throughout for consistency with the
 *     rest of the wizard.
 */

import { useFormContext, useWatch } from "react-hook-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Bank, CreditCard, ArrowLineDown, Plus, Trash } from "@phosphor-icons/react";

import { useLoanTransfersContext } from "../loan-transfers-provider";
import { TransferActionMenu } from "./transfer-action-menu";
import { SectionCard, SubSectionHeading } from "./section-card";
import { getSection } from "../sections";

type EbiRow = {
    pn?: string;
    name?: string;
    existingDeduction?: number;
    outstandingBalance?: number;
    payToClose?: number;
};
type BuyOutRow = { pn?: string; name?: string; amortization?: number; outstandingBalance?: number };
type IncomingRow = { name?: string; deductions?: number; remarks?: string };

export function OtherObligationsSection() {
    const { control, register, formState: { errors }, getValues } = useFormContext();
    // `arrays` is consumed for RHF row ids (React keys) and for the
    // append/remove helpers used by the Add/Delete buttons. The
    // bidirectional transfer hook (`handleTransfer`) is wired up to
    // the EBI rows below.
    // Consume the SINGLE shared `useLoanTransfers` instance via context.
    // Calling `useLoanTransfers()` directly here would mount a second
    // `useFieldArray("ebiReloans")` (and a second set for the other
    // three arrays) whose `fields` snapshots never see mutations made
    // by Section 4's instance, so a transfer fired from the Outstanding
    // Loans table would silently disappear here. See
    // loan-transfers-provider.tsx for the full contract.
    const { arrays, handleTransfer } = useLoanTransfersContext();

    // Row-level validation errors raised by `ebiReloanSchema`'s
    // `superRefine` (e.g. payToClose > outstandingBalance) live at
    // `errors.ebiReloans[i].payToClose`. We narrow them here so the
    // table cells can render the message inline without forcing every
    // caller to redo the type narrowing.
    const ebiRowErrors = (errors.ebiReloans as Array<{ payToClose?: { message?: string } }> | undefined) ?? [];

    // ── Iterate `useFieldArray.fields` (not `useWatch`) ─────────────────
    // Iterating over `arrays.ebi.fields` is the only reliable way to
    // get a stable RHF-generated `id` per row. The previous version
    // mapped over `useWatch`'s data array and then *guessed* the id by
    // indexing `fields[i]` — that index frequently desyncs from the
    // data index (e.g. when `setValue("outstandingLoans", [...])`
    // replaces the whole array in `active-loans-table.tsx`, which
    // bypasses `useFieldArray`'s mutation API). The desync surfaced as
    // "Could not transfer loan — source row not found." when the user
    // tried to move a row back from EBI to Outstanding. Iterating the
    // `fields` snapshot directly removes the guess entirely: every
    // `field.id` here is the *same* id `useFieldArray`'s `remove` will
    // accept on the matching `findIndex` inside `useLoanTransfers`.
    const ebiFields = arrays.ebi.fields;
    const buyOutFields = arrays.buyOut.fields;
    const incomingFields = arrays.incoming.fields;

    // Row *data* is still pulled from `useWatch` (or `getValues`) so the
    // inputs render the latest values, but we index that array by the
    // `field` index — which, since both `fields` and `getValues` read
    // from the same RHF store, stays aligned.
    const ebiReloansValues = (getValues("ebiReloans") as EbiRow[] | undefined) ?? [];
    const buyOutValues = (getValues("buyOuts") as BuyOutRow[] | undefined) ?? [];
    const incomingValues = (getValues("incomingLoans") as IncomingRow[] | undefined) ?? [];

    // Kept for backward compatibility with anything downstream that may
    // re-render on these watched values (the sections still need to
    // re-render when the underlying form state mutates). Using
    // `useWatch` here ensures we re-render when the AO types into any
    // row input.
    useWatch({ control, name: "ebiReloans" });
    useWatch({ control, name: "buyOuts" });
    useWatch({ control, name: "incomingLoans" });

    // ── Add-row handlers ────────────────────────────────────────────────
    // We seed each new row with empty strings / zeros rather than
    // undefined so the schema's `.default(...)` constraints are happy
    // and the inputs render a stable initial DOM node.
    const addBuyOut = () => {
        arrays.buyOut.append({ pn: "", name: "", amortization: 0, outstandingBalance: 0 });
    };

    const addIncoming = () => {
        arrays.incoming.append({ name: "", deductions: 0, remarks: "" });
    };

    const section = getSection("other-obligations");

    return (
        <SectionCard
            step={section.step}
            title={section.label}
            description={section.description}
            systemSourced
            contentClassName="p-0 divide-y"
        >
            {/* ── EBI Reloans ─────────────────────────────────────── */}
            <div className="p-4">
                <SubSectionHeading
                    step="5.1"
                    title="EBI Accounts for Reloans"
                    actions={
                        <Bank size={16} weight="bold" className="text-primary" />
                    }
                />
                <Table className="mt-3">
                    <TableHeader>
                        <TableRow>
                            {/* PN / Account No. is widened to 180px so
                                typical 8–12 digit account numbers stay
                                readable without truncation, while still
                                leaving room for the other columns. */}
                            <TableHead className="w-[180px]">PN / Account No.</TableHead>
                            {/* Product Name and Existing Deduction share the
                                remaining horizontal space evenly via
                                `flex-1`, so neither dominates the row. The
                                `min-w-[140px]` floor prevents either column
                                from collapsing into illegibility on narrow
                                viewports. */}
                            <TableHead className="flex-1 min-w-[140px]">
                                Product Name
                            </TableHead>
                            <TableHead className="text-right flex-1 min-w-[140px]">
                                Existing Deduction
                            </TableHead>
                            <TableHead className="text-right w-[160px]">Pay to Close</TableHead>
                            <TableHead className="w-[50px]">
                                <span className="sr-only">Row actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ebiFields.map((field, i) => {
                            // `i` here is the index into `useFieldArray`'s
                            // `fields` snapshot, which matches `getValues`'s
                            // index for the same row (both read from RHF's
                            // internal store on every render). Reading the
                            // row's data through `ebiReloansValues[i]` (not
                            // through a captured iteration variable) keeps
                            // the data in sync with the `fields` snapshot.
                            const loan = ebiReloansValues[i];
                            return (
                                <TableRow
                                    key={field.id}
                                    className="hover:bg-muted/30"
                                >
                                    <TableCell className="min-w-0">
                                        <Input
                                            {...register(`ebiReloans.${i}.pn`)}
                                            defaultValue={loan?.pn}
                                            readOnly
                                            title={loan?.pn}
                                            className="h-8 text-xs bg-muted/50 min-w-0 overflow-hidden text-ellipsis"
                                        />
                                    </TableCell>
                                    <TableCell className="min-w-0">
                                        <Input
                                            {...register(`ebiReloans.${i}.name`)}
                                            defaultValue={loan?.name}
                                            readOnly
                                            title={loan?.name}
                                            className="h-8 text-xs bg-muted/50 min-w-0 overflow-hidden text-ellipsis"
                                        />
                                    </TableCell>
                                    <TableCell className="min-w-0">
                                        <Input
                                            type="number"
                                            {...register(`ebiReloans.${i}.existingDeduction`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.existingDeduction}
                                            readOnly
                                            className="h-8 text-right text-xs bg-muted/50 min-w-0 overflow-hidden text-ellipsis"
                                        />
                                    </TableCell>
                                    {(() => {
                                        // ── Manual input: Pay to Close ────────────
                                        // Unlike the rest of the EBI row (which is
                                        // read-only and populated via transfers), the
                                        // pay-to-close amount is hand-keyed by the AO
                                        // and validated against the row's outstanding
                                        // balance by `ebiReloanSchema.superRefine`.
                                        const payToCloseError =
                                            ebiRowErrors[i]?.payToClose?.message;
                                        return (
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        {...register(
                                                            `ebiReloans.${i}.payToClose`,
                                                            { valueAsNumber: true },
                                                        )}
                                                        defaultValue={loan?.payToClose ?? 0}
                                                        placeholder="0.00"
                                                        aria-invalid={!!payToCloseError}
                                                        aria-label={`Pay to close for ${loan?.name ?? loan?.pn ?? `row ${i + 1}`}`}
                                                        className={
                                                            "h-8 text-right text-xs " +
                                                            (payToCloseError
                                                                ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50"
                                                                : "")
                                                        }
                                                    />
                                                    {payToCloseError && (
                                                        <span className="text-[10px] leading-tight text-destructive font-medium">
                                                            {payToCloseError}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    })()}
                                    <TableCell className="text-right">
                                        <TransferActionMenu
                                            currentSection="ebi"
                                            onTransfer={(target) =>
                                                // Pass `field.id` directly — it is the
                                                // RHF-generated id for this exact row,
                                                // and `useFieldArray.findIndex` inside
                                                // the hook will find it unambiguously.
                                                handleTransfer("ebi", field.id, target)
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {ebiFields.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-xs text-muted-foreground py-4"
                                >
                                    No EBI reloans added. Transfer from Outstanding Loans to add.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Buy-Outs from Other FIs ─────────────────────────── */}
            <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                    <SubSectionHeading
                        step="5.2"
                        title="Buy-Out Accounts (Other FIs)"
                        actions={
                            <CreditCard size={16} weight="bold" className="text-primary" />
                        }
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addBuyOut}
                        className="gap-1.5"
                    >
                        <Plus size={14} weight="bold" /> Add Account
                    </Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">PN / Ref No.</TableHead>
                            <TableHead>Financial Institution / Name</TableHead>
                            <TableHead className="text-right">Monthly Amort</TableHead>
                            <TableHead className="text-right">Outstanding Balance</TableHead>
                            <TableHead className="w-[50px]">
                                <span className="sr-only">Row actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {buyOutFields.map((field, i) => {
                            const loan = buyOutValues[i];
                            return (
                                <TableRow
                                    key={field.id}
                                    className="group hover:bg-muted/30"
                                >
                                    <TableCell>
                                        <Input
                                            {...register(`buyOuts.${i}.pn`)}
                                            defaultValue={loan?.pn}
                                            className="h-8 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            {...register(`buyOuts.${i}.name`)}
                                            defaultValue={loan?.name}
                                            className="h-8 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`buyOuts.${i}.amortization`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.amortization}
                                            className="h-8 text-right text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`buyOuts.${i}.outstandingBalance`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.outstandingBalance}
                                            className="h-8 text-right text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => arrays.buyOut.remove(i)}
                                            aria-label="Delete buy-out account"
                                        >
                                            <Trash size={14} weight="bold" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {buyOutFields.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-xs text-muted-foreground py-4"
                                >
                                    No external buy-outs added. Click "Add Account" to declare one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Incoming / Undeducted ───────────────────────────── */}
            <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                    <SubSectionHeading
                        step="5.3"
                        title="Incoming / Undeducted Loans"
                        actions={
                            <ArrowLineDown size={16} weight="bold" className="text-primary" />
                        }
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addIncoming}
                        className="gap-1.5"
                    >
                        <Plus size={14} weight="bold" /> Add Loan
                    </Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Creditor / Name</TableHead>
                            <TableHead className="text-right">Expected Deduction</TableHead>
                            <TableHead>Remarks / Notes</TableHead>
                            <TableHead className="w-[50px]">
                                <span className="sr-only">Row actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {incomingFields.map((field, i) => {
                            const loan = incomingValues[i];
                            return (
                                <TableRow
                                    key={field.id}
                                    className="group hover:bg-muted/30"
                                >
                                    <TableCell>
                                        <Input
                                            {...register(`incomingLoans.${i}.name`)}
                                            defaultValue={loan?.name}
                                            className="h-8 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...register(`incomingLoans.${i}.deductions`, {
                                                valueAsNumber: true,
                                            })}
                                            defaultValue={loan?.deductions}
                                            className="h-8 text-right text-xs"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            {...register(`incomingLoans.${i}.remarks`)}
                                            defaultValue={loan?.remarks}
                                            className="h-8 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => arrays.incoming.remove(i)}
                                            aria-label="Delete incoming loan"
                                        >
                                            <Trash size={14} weight="bold" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {incomingFields.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="text-center text-xs text-muted-foreground py-4"
                                >
                                    No incoming loans declared. Click "Add Loan" to add one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

        </SectionCard>
    );
}