import { z } from "zod";

/**
 * Validate and parse an API response at the network boundary.
 *
 * This is the banking-grade way to handle API responses:
 * 1. Validate the response shape matches our schema
 * 2. Throw a descriptive error if validation fails
 * 3. Return the validated data with proper typing
 *
 * @param schema - Zod schema to validate against
 * @param data - Raw data from the API
 * @returns Validated and typed data
 * @throws {ZodError} If validation fails
 *
 * @example
 * ```typescript
 * const response = await apiClient.get("/api/loans/123");
 * const loan = validateResponse(LoanResponseSchema, response.data);
 * // loan is now fully typed and validated
 * ```
 */
export function validateResponse<T>(
    schema: z.ZodType<T>,
    data: unknown
): T {
    return schema.parse(data);
}

/**
 * Safely validate an API response, returning null if validation fails.
 *
 * Use this when you want to handle validation failures gracefully
 * instead of throwing.
 *
 * @param schema - Zod schema to validate against
 * @param data - Raw data from the API
 * @returns Validated data or null if validation failed
 */
export function safeValidateResponse<T>(
    schema: z.ZodType<T>,
    data: unknown
): T | null {
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
}

/**
 * Validate an API response with a fallback value.
 *
 * Use this when you want to provide a default value if validation fails.
 *
 * @param schema - Zod schema to validate against
 * @param data - Raw data from the API
 * @param fallback - Default value if validation fails
 * @returns Validated data or fallback
 *
 * @example
 * ```typescript
 * const response = await apiClient.get("/api/dashboard");
 * const dashboard = validateResponseWithFallback(
 *   DashboardDataSchema,
 *   response.data,
 *   { summary: null, pendingQueue: [], ... }
 * );
 * ```
 */
export function validateResponseWithFallback<T>(
    schema: z.ZodType<T>,
    data: unknown,
    fallback: T
): T {
    const result = schema.safeParse(data);
    return result.success ? result.data : fallback;
}

/**
 * Validate and unwrap an ApiResponse envelope.
 *
 * This combines the standard ApiResponse unwrapping with Zod validation.
 *
 * @param dataSchema - Schema for the data payload
 * @param response - Raw API response
 * @returns Validated data payload
 * @throws {Error} If the API returned success: false
 * @throws {ZodError} If validation fails
 *
 * @example
 * ```typescript
 * const res = await apiClient.get("/api/loans/123");
 * const loan = validateAndUnwrap(LoanResponseSchema, res.data);
 * ```
 */
export function validateAndUnwrap<T>(
    dataSchema: z.ZodType<T>,
    response: unknown
): T {
    // First validate the envelope
    const envelopeSchema = z.object({
        success: z.boolean(),
        message: z.string(),
        data: dataSchema.nullable(),
        errors: z.array(z.string()),
        timestamp: z.string(),
    });
    const envelope = envelopeSchema.parse(response);

    // Then check if the API reported success
    if (!envelope.success || envelope.data === null) {
        throw new Error(envelope.message || "Request failed");
    }

    return envelope.data as T;
}
