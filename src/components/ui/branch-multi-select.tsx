import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";
import { CaretDown, X } from "@phosphor-icons/react";

interface BranchMultiSelectProps {
    branches: ReadonlyArray<{ code: string; name: string }>;
    selected: string[];
    onChange: (codes: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function BranchMultiSelect({
    branches,
    selected,
    onChange,
    placeholder = "Select branches",
    disabled = false,
    className,
}: BranchMultiSelectProps) {
    const [open, setOpen] = useState(false);

    const toggle = (code: string) => {
        onChange(
            selected.includes(code)
                ? selected.filter((c) => c !== code)
                : [...selected, code]
        );
    };

    const remove = (code: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selected.filter((c) => c !== code));
    };

    const selectedNames = selected
        .map((code) => branches.find((b) => b.code === code)?.name ?? code)
        .filter(Boolean);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "h-auto min-h-9 w-full justify-between font-normal",
                            selected.length === 0 && "text-muted-foreground",
                            className,
                        )}
                    >
                        <div className="flex flex-wrap gap-1 overflow-hidden">
                            {selected.length === 0 ? (
                                <span>{placeholder}</span>
                            ) : selectedNames.length <= 2 ? (
                                selectedNames.map((name) => (
                                    <Badge
                                        key={name}
                                        variant="secondary"
                                        className="gap-1 text-xs font-normal"
                                    >
                                        {name}
                                        {!disabled && (
                                            <X
                                                size={10}
                                                className="cursor-pointer hover:text-destructive"
                                                onClick={(e) => remove(
                                                    branches.find((b) => b.name === name)?.code ?? "",
                                                    e,
                                                )}
                                            />
                                        )}
                                    </Badge>
                                ))
                            ) : (
                                <Badge variant="secondary" className="text-xs font-normal">
                                    {selectedNames.length} branches selected
                                </Badge>
                            )}
                        </div>
                        <CaretDown size={14} className="shrink-0 opacity-50" />
                    </Button>
                }
            />
            <PopoverContent
                align="start"
                className="w-[var(--anchor-width)] p-0"
            >
                <ScrollArea className="max-h-60">
                    <div className="p-1">
                        {branches.map((branch) => {
                            const isChecked = selected.includes(branch.code);
                            return (
                                <label
                                    key={branch.code}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                                        isChecked && "bg-accent/50",
                                    )}
                                >
                                    <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => toggle(branch.code)}
                                    />
                                    <span className="flex-1 truncate">{branch.name}</span>
                                    <span className="text-xs text-muted-foreground">{branch.code}</span>
                                </label>
                            );
                        })}
                    </div>
                </ScrollArea>
                {selected.length > 0 && (
                    <div className="border-t p-1">
                        <button
                            type="button"
                            className="w-full rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={() => onChange([])}
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
