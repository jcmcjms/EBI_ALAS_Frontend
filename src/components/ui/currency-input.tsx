import { useCallback, useEffect, useState } from "react";
import { ArrowsClockwise, WarningCircle } from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";

/**
 * Bank-grade PHP currency input.
 *
 * Native `<input type="number">` is hostile UX for money entry:
 *   - ugly spinner arrows next to each digit,
 *   - no thousands grouping,
 *   - no leading-currency glyph,
 *   - copy/paste gets a raw `e+`-style number back.
 *
 * `CurrencyInput` solves those by:
 *   1. **Always storing a number in form state.** The parent form gets a
 *      stable `number` via `onChange` — formatting is purely visual.
 *   2. **Formatting to PHP standards on blur** (`Intl.NumberFormat('en-PH')`
 *      with `minimumFractionDigits: 2`). On focus, formatting is stripped so
 *      the AO can edit / arrow-key / backspace without fighting commas.
 *   3. **Surfacing a "standard" suggestion.** When `suggestedValue` is
 *      supplied, the AO sees a Reset button the moment their value diverges
 *      from it (and a deviation warning underneath). This is the *Smart
 *      Default with Editable Override* pattern — the bank's policy says
 *      ₱500 is the standard notarial fee, but the actual notary may have
 *      charged differently, and the AO needs a documented way to deviate
 *      rather than a free-form field they might fat-finger.
 *
 * **Why a number on the wire:** RHF + Zod work in `number`s; rounding /
 *      formatting is presentation-only. The form sees `0` / `1500.50`, not
 *      `"₱1,500.50"`.
 */
export interface CurrencyInputProps {
    /** Current numeric value held in form state. `undefined` = empty. */
    value: number | undefined;
    /**
     * Called on every keystroke with the parsed numeric value.
     * `0` is sent for empty / invalid input — never `NaN` — so the form
     * always has a stable numeric to bind against.
     */
    onChange: (value: number) => void;
    /**
     * The "standard" fee the bank's policy expects for this product.
     * When the AO's value diverges from this (beyond a 0.01 tolerance for
     * floating-point rounding), the Reset button + deviation warning
     * appear.
     */
    suggestedValue?: number;
    /** Disables the input + hides the Reset button. */
    disabled?: boolean;
    /** Extra classes for the input wrapper. */
    className?: string;
    /**
     * When `false`, hides the deviation caption under the input. Defaults
     * to `true` — the warning is part of the audit trail UX.
     */
    showDeviationWarning?: boolean;
    /** Accessible label for the underlying `<input>`. */
    "aria-label"?: string;
}

/** PHP currency formatter. Shared between display + reset tooltip. */
function formatPHP(val: number | undefined | null): string {
    if (val === undefined || val === null || !Number.isFinite(val)) return "";
    return new Intl.NumberFormat("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(val);
}

/** Strip everything that isn't a digit or a decimal point. */
function stripNonNumeric(raw: string): string {
    return raw.replace(/[^0-9.]/g, "");
}

/**
 * Cap at one decimal point so a pasted "1.2.3" becomes "1.23" rather than
 * silently going to `NaN`. Keeps the trailing digits so the AO can keep
 * editing — the parser below will accept what they typed.
 */
function collapseMultipleDots(raw: string): string {
    const firstDot = raw.indexOf(".");
    if (firstDot === -1) return raw;
    const head = raw.slice(0, firstDot + 1);
    const tail = raw.slice(firstDot + 1).replace(/\./g, "");
    return head + tail;
}

/**
 * Equality tolerance. Two currency values within ₱0.01 are "the same" —
 * covers the floating-point rounding that bites `0.1 + 0.2`-style inputs.
 */
const VALUE_TOLERANCE = 0.01;

export function CurrencyInput({
    value,
    onChange,
    suggestedValue,
    disabled,
    className,
    showDeviationWarning = true,
    "aria-label": ariaLabel = "Currency amount",
}: CurrencyInputProps) {
    // `displayValue` is the *visual* string in the input — may be
    // "1500.50" while focused (so backspace/delete behave naturally) or
    // "1,500.50" while blurred (so it reads like a peso amount).
    const [displayValue, setDisplayValue] = useState<string>(() => formatPHP(value));
    const [isFocused, setIsFocused] = useState(false);

    // ── Sync display when the form's value changes externally ─────────────
    //
    // We only re-format while the input is *not* focused; otherwise we'd
    // yank the cursor mid-typing. The parent's value drives us on
    // blur / reset / auto-fill from the product rules.
    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(formatPHP(value));
        }
    }, [value, isFocused]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const cleaned = collapseMultipleDots(stripNonNumeric(e.target.value));
            setDisplayValue(cleaned);

            // Empty string → 0, never NaN. RHF + Zod need a stable number.
            if (cleaned === "" || cleaned === ".") {
                onChange(0);
                return;
            }
            const parsed = parseFloat(cleaned);
            onChange(Number.isFinite(parsed) ? parsed : 0);
        },
        [onChange]
    );

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        // Strip formatting so the AO lands on the raw number — easier to
        // backspace a digit than to navigate around commas.
        const raw =
            value !== undefined && Number.isFinite(value) ? value.toString() : "";
        setDisplayValue(raw);
    }, [value]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        // Formatting re-applies on the next render via the effect above.
    }, []);

    const handleReset = useCallback(() => {
        if (suggestedValue === undefined) return;
        onChange(suggestedValue);
        // Drop focus so the formatted version displays immediately.
        setIsFocused(false);
    }, [onChange, suggestedValue]);

    // Deviation is checked against the *numeric* difference, not the
    // formatted string — formatting "1,500.00" vs "1,500" would otherwise
    // trip the warning on a no-op edit.
    const isOverridden =
        suggestedValue !== undefined &&
        value !== undefined &&
        Math.abs(value - suggestedValue) > VALUE_TOLERANCE;

    return (
        <div className="space-y-1">
            <div className="relative flex items-center gap-2">
                <span
                    className="absolute left-2.5 z-10 text-xs text-muted-foreground pointer-events-none select-none"
                    aria-hidden
                >
                    ₱
                </span>
                <Input
                    type="text"
                    inputMode="decimal"
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    className={cn("pl-6 pr-9 text-right tabular-nums", className)}
                />
                {isOverridden && !disabled && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-6 w-6"
                        onClick={handleReset}
                        title={`Reset to standard fee (₱${formatPHP(suggestedValue)})`}
                        aria-label="Reset to standard fee"
                    >
                        <ArrowsClockwise className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {isOverridden && showDeviationWarning && (
                <p className="flex items-center gap-1 px-1 text-[11px] text-amber-600">
                    <WarningCircle className="h-3 w-3" weight="fill" />
                    Deviates from standard fee. Justification required for approval.
                </p>
            )}
        </div>
    );
}
