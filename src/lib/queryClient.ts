import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient — wired once at app boot (see `src/main.tsx`).
 *
 * Defaults are tuned for the ALAS banking platform:
 *  - Banking data is mostly reference/lookup; we keep it sticky for a while
 *    so 500+ concurrent users don't hammer `/api/branches`, `/api/loan-products`,
 *    etc. on every page render.
 *  - Per-user rate limit (120 req/min) makes duplicate fetches expensive;
 *    aggressive `staleTime` is the simplest defense.
 *  - No window-focus refetch — the app uses explicit refresh buttons and
 *    TanStack-driven invalidation, not heuristic background refetches.
 *
 * Per-query overrides live in the corresponding `use*` hooks (e.g. /api/branches
 * uses `staleTime: 60 * 60_000`); see `src/lib/queryKeys.ts` for the canonical
 * key factory.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000, // 1 minute — sensible default for everything not explicitly pinned
            gcTime: 10 * 60_000, // 10 minutes — keep recently-used data warm in cache
            refetchOnWindowFocus: false, // banking app — explicit refresh buttons only
            retry: 1, // single retry on transient network failure; auth/CSRF errors are not retried by the interceptor
        },
        mutations: {
            retry: 0, // mutations are idempotency-sensitive; do not retry automatically
        },
    },
});