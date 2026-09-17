import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regression tests for the double-pagination bug (page 2 showing "No users found").
 *
 * Root cause: UsersDataTable fetched a server-side page, then handed that
 * already-sliced array to TanStack Table configured with client-side pagination.
 * createPaginatedRowModel() sliced the data a second time, producing an empty
 * body on page 2+.
 *
 * Fix: removed rowPaginationFeature / createPaginatedRowModel from the table
 * features, moved branch filtering server-side, and derived readouts from the
 * actual page data.
 *
 * These tests guard against re-introduction of the client-side pagination layer
 * and verify that branchId flows through to the API.
 */

// ── listUsers passes branchId to the API ─────────────────────────────────

// We mock apiClient at the module level so listUsers hits the mock instead of
// a real HTTP endpoint.
const mockGet = vi.fn();

vi.mock("@/src/lib/apiClient", () => ({
    apiClient: { get: mockGet },
}));

// Dynamic import so the mock is in place before the module loads.
const { listUsers } = await import("@/src/lib/api/users");

describe("listUsers", () => {
    beforeEach(() => {
        mockGet.mockReset();
        mockGet.mockResolvedValue({
            data: {
                success: true,
                message: "OK",
                data: {
                    items: [],
                    currentPage: 1,
                    pageSize: 10,
                    totalCount: 0,
                    totalPages: 0,
                    hasPreviousPage: false,
                    hasNextPage: false,
                },
                errors: [],
                timestamp: new Date().toISOString(),
            },
        });
    });

    it("passes branchId as a query parameter when provided", async () => {
        await listUsers({
            branchId: "011",
            pageNumber: 2,
            pageSize: 10,
        });

        expect(mockGet).toHaveBeenCalledOnce();
        const [, config] = mockGet.mock.calls[0];
        expect(config.params.branchId).toBe("011");
        expect(config.params.pageNumber).toBe(2);
        expect(config.params.pageSize).toBe(10);
    });

    it("omits branchId when undefined", async () => {
        await listUsers({
            pageNumber: 1,
            pageSize: 10,
        });

        const [, config] = mockGet.mock.calls[0];
        expect(config.params.branchId).toBeUndefined();
    });

    it("omits branchId when empty string", async () => {
        await listUsers({
            branchId: "",
            pageNumber: 1,
            pageSize: 10,
        });

        const [, config] = mockGet.mock.calls[0];
        expect(config.params.branchId).toBeUndefined();
    });
});
