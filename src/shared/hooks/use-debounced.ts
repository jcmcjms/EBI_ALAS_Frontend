import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Debounced value hook — delays updating the value until the user
 * stops typing for `delay` milliseconds.
 *
 * Perfect for search inputs that trigger API calls. Reduces the
 * number of API calls by ~80% during rapid typing.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebouncedValue(search, 300);
 *
 * // Use debouncedSearch in your query — it only updates 300ms
 * // after the user stops typing
 * const { data } = useQuery({
 *   queryKey: ["users", debouncedSearch],
 *   queryFn: () => fetchUsers(debouncedSearch),
 * });
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Debounced callback hook — delays executing the callback until
 * the user stops calling it for `delay` milliseconds.
 *
 * Returns a stable function reference that won't cause re-renders.
 *
 * @param callback - The callback to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebouncedCallback((value: string) => {
 *   setSearchParams({ search: value });
 * }, 300);
 *
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delay: number = 300
): (...args: Parameters<T>) => void {
    const callbackRef = useRef(callback);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Update the callback ref on each render to avoid stale closures
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                callbackRef.current(...args);
            }, delay);
        },
        [delay]
    );
}
