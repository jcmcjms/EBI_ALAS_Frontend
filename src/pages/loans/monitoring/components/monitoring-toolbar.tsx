import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MagnifyingGlass, CalendarBlank, Funnel, Export } from "@phosphor-icons/react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { MonitoringFilters } from "../types";

interface ToolbarProps {
    filters: MonitoringFilters;
    onFiltersChange: (filters: MonitoringFilters) => void;
}

export function MonitoringToolbar({ filters, onFiltersChange }: ToolbarProps) {
    const [localSearch, setLocalSearch] = useState(filters.search);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            onFiltersChange({ ...filters, search: localSearch });
        }, 300);
        return () => clearTimeout(timer);
    }, [localSearch]);

    return (
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-4 border-b bg-muted/20">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
                <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-muted-foreground" weight="bold" />
                <Input
                    placeholder="Search Form #, Name, or Product..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="pl-9 h-9 bg-background"
                />
            </div>

            {/* Date Range Picker */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-[240px] justify-start text-left font-normal bg-background">
                        <CalendarBlank size={16} className="mr-2 text-muted-foreground" weight="bold" />
                        {filters.dateRange.from ? (
                            filters.dateRange.to ? (
                                <>
                                    {format(filters.dateRange.from, "LLL dd, y")} - {format(filters.dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(filters.dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span className="text-muted-foreground">Application Date Range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filters.dateRange.from}
                        selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                        onSelect={(range) => onFiltersChange({ ...filters, dateRange: { from: range?.from, to: range?.to } })}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>

            {/* Status Filter */}
            <Select value={filters.status[0] || "all"} onValueChange={(val) => onFiltersChange({ ...filters, status: val === "all" ? [] : [val as any] })}>
                <SelectTrigger className="h-9 w-[140px] bg-background">
                    <Funnel size={14} className="mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-9 ml-auto gap-1.5 text-xs">
                <Export size={14} weight="bold" /> Export CSV
            </Button>
        </div>
    );
}