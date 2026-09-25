/**
 * Deviation catalog hook — fetches deviation reasons with severity from API.
 */

import { useQuery } from "@tanstack/react-query";
import {
    getDeviationCatalog,
    approvalMatrixKeys,
    type DeviationCatalogItemDto,
} from "../api/approval-matrix";

export function useDeviationCatalog(enabled = true) {
    return useQuery<DeviationCatalogItemDto[]>({
        queryKey: approvalMatrixKeys.deviationCatalog(),
        queryFn: getDeviationCatalog,
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes — matches backend cache
    });
}

export type { DeviationCatalogItemDto };