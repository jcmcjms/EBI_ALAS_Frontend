import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Path } from "@phosphor-icons/react";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

/**
 * Lightweight HTML5 Canvas signature pad.
 *
 * Design notes:
 *   - Dependency-free. The implementation uses the Canvas 2D context
 *     directly so we don't pull in `react-signature-canvas` or a similar
 *     wrapper (~30KB+ minified).
 *   - High-DPI safe. The canvas backing store is sized at `devicePixelRatio`
 *     so lines stay crisp on Retina / 4K branch tablets.
 *   - Touch-friendly. `touch-action: none` (applied via the `touch-none`
 *     utility) prevents the browser from scrolling the page while the
 *     user is drawing.
 *   - PointerEvent-style UX. We accept both mouse and touch handlers and
 *     `preventDefault()` on the synthetic events so a stray gesture never
 *     scrolls the drawer underneath.
 *
 * Output is a base64-encoded PNG dataURL. The caller decides whether to
 * persist it — the component itself is fully controlled.
 */
export interface SignaturePadProps {
    /** Current base64 PNG to render on first paint. Updates are not
     *  re-rendered after the user starts drawing (the user owns the
     *  canvas once they put pen to paper). */
    value?: string | null;
    /** Fires on every completed stroke (pointer up) AND on clear.
     *  - `string`  = a base64 PNG of the current canvas
     *  - `null`    = the user cleared the pad (or initial empty state) */
    onChange?: (base64: string | null) => void;
    /** Tailwind height class for the canvas wrapper. Defaults to h-32. */
    heightClassName?: string;
    /** Optional disabled flag — disables pointer events on the canvas. */
    disabled?: boolean;
}

export function SignaturePad({
    value,
    onChange,
    heightClassName = "h-32",
    disabled = false,
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // Track whether the canvas backing store has been (re)sized for the
    // current DPR / layout. Re-running this on every render would wipe
    // an in-progress stroke.
    const isInitializedRef = useRef(false);
    const [isDrawing, setIsDrawing] = useState(false);
    // Drawing state is intentionally local — there's no value in
    // exposing "am I currently drawing?" to the parent.

    /** Resize the canvas backing store to match the CSS box * devicePixelRatio. */
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        // Guard against zero-sized layout (e.g. while a parent sheet is
        // still animating open) — skip the resize rather than divide by
        // zero or paint a 0×0 surface.
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset any prior scale
        ctx.scale(dpr, dpr);

        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#0f172a"; // slate-900 — high contrast on white
    }, []);

    /** Render an existing base64 PNG into the canvas (used when seeding
     *  the pad with a previously stored signature). */
    const seedFromValue = useCallback((src: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = src;
    }, []);

    // One-shot initialization: size the canvas, optionally paint the
    // existing signature, then mark the ref so we don't repeat the work
    // on every render.
    useEffect(() => {
        if (isInitializedRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        resizeCanvas();
        if (value) seedFromValue(value);
        isInitializedRef.current = true;
    }, [value, resizeCanvas, seedFromValue]);

    // Re-seed the canvas if the upstream `value` changes after mount.
    // We deliberately only do this when the parent hands us a NEW value
    // (e.g. switching users in the edit drawer) — we do not re-paint
    // after every stroke because `onChange` round-trips through state
    // and would otherwise erase the in-progress drawing.
    useEffect(() => {
        if (!isInitializedRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        if (value) {
            // Clear before re-seeding so we don't paint over an old stroke.
            ctx.clearRect(0, 0, rect.width, rect.height);
            seedFromValue(value);
        }
        // Intentionally exclude `seedFromValue` from deps — its identity
        // changes every render via the inline arrow above and would
        // re-trigger the effect on every parent state update.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    /** Resolve a pointer event to canvas-local coordinates. */
    const getCoordinates = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    ): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ("touches" in e && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        if ("clientX" in e) {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        }
        return { x: 0, y: 0 };
    };

    const startDrawing = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    ) => {
        if (disabled) return;
        e.preventDefault(); // suppress scrolling on touch devices
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    ) => {
        if (!isDrawing) return;
        e.preventDefault();
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const endDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (!canvas || !onChange) return;
        onChange(canvas.toDataURL("image/png"));
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        onChange?.(null);
    };

    return (
        <div className="space-y-2">
            <div
                className={cn(
                    "relative rounded-md border bg-background",
                    disabled && "pointer-events-none opacity-60",
                )}
            >
                <canvas
                    ref={canvasRef}
                    className={cn(
                        "block w-full touch-none cursor-crosshair",
                        heightClassName,
                    )}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                />
                {/* Eraser overlay sits absolutely so it doesn't disrupt the
                    canvas pointer flow. */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1 text-muted-foreground hover:text-destructive"
                    onClick={clear}
                    aria-label="Clear signature"
                    disabled={disabled}
                >
                    <Eraser size={14} />
                </Button>
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Path size={12} />
                Draw your signature above. The image is stored as a small PNG
                alongside your profile.
            </p>
        </div>
    );
}
