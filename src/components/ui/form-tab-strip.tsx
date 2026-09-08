import { useRef } from "react";
import { cn } from "@/src/lib/utils";

export interface FormTabItem {
  value: string;
  /** Primary token — product code. */
  label: string;
  /** Secondary — PN tail, mono. */
  hint?: string;
  /** Tertiary — amount/metric, tabular. */
  metric?: string;
  title?: string;
  /** Destructive indicator dot (row has validation errors). */
  hasError?: boolean;
}

interface FormTabStripProps {
  items: FormTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  /** Surface the active tab merges into: white print sheet vs card body. */
  activeSurface?: "sheet" | "card";
  /** Right slot on the seam (counter, prev/next). */
  trailing?: React.ReactNode;
}

/**
 * Lyra-conformant selector strip: square corners, 1px hairlines, flat
 * surfaces, 2px primary accent on the active tab (same accent language
 * as the sidebar stepper's left bar). The active tab's bottom border
 * takes the panel surface color and overlaps the track hairline via
 * -mb-px, so tab + panel read as ONE connected object — not floating
 * pills. WAI-ARIA tabs pattern: roving tabindex, arrow/Home/End keys,
 * automatic activation (panels are local form state, cheap to swap).
 */
export function FormTabStrip({
  items, value, onValueChange, ariaLabel,
  activeSurface = "card", trailing,
}: FormTabStripProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusAndSelect = (index: number) => {
    const next = (index + items.length) % items.length;
    onValueChange(items[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); focusAndSelect(index - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); focusAndSelect(index + 1); }
    if (e.key === "Home") { e.preventDefault(); focusAndSelect(0); }
    if (e.key === "End") { e.preventDefault(); focusAndSelect(items.length - 1); }
  };

  return (
    <div className="flex items-end gap-2 print:hidden">
      {/* Hairline lives on this wrapper (NOT the scroll container, or the
          -mb-px overlap would be clipped by overflow-x-auto). */}
      <div className="min-w-0 flex-1 border-b border-border">
        <div
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation="horizontal"
          className="-mb-px flex items-end gap-1 overflow-x-auto [scrollbar-width:thin]"
        >
          {items.map((item, i) => {
            const active = item.value === value;
            return (
              <button
                key={item.value}
                ref={(el) => { refs.current[i] = el; }}
                type="button"
                role="tab"
                id={`form-tab-${item.value}`}
                aria-selected={active}
                aria-controls={`form-panel-${item.value}`}
                tabIndex={active ? 0 : -1}
                title={item.title}
                onClick={() => onValueChange(item.value)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-none border px-3 py-2 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  // border-t-2 on BOTH states keeps tab heights identical;
                  // inactive just makes the accent transparent.
                  active
                    ? cn(
                        "border-border border-t-2 border-t-primary text-foreground shadow-none",
                        activeSurface === "sheet" ? "border-b-white bg-white" : "border-b-card bg-card"
                      )
                    : "border-border border-t-2 border-t-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className="font-semibold">{item.label}</span>
                {item.hint && <span className="font-mono tabular-nums opacity-70">{item.hint}</span>}
                {item.metric && <span className="tabular-nums opacity-70">{item.metric}</span>}
                {item.hasError && (
                  <span className="size-1.5 rounded-full bg-destructive" aria-label="Has validation errors" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-1 pb-1">{trailing}</div>}
    </div>
  );
}
