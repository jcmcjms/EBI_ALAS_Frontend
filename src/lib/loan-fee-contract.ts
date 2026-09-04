/**
 * Loan Fee Backend Contract — .NET 8 reference implementation.
 *
 * The frontend implements the *display side* of the "Smart Default with
 * Editable Override" pattern; the backend is the *security* side. This
 * file mirrors the C# implementation the backend team owns so the two
 * halves stay in lockstep and the FE devs can hand this doc to the .NET
 * team as the authoritative spec.
 *
 * ---
 *
 * ## 1. Backend re-validation (NEVER trust the frontend)
 *
 * The .NET 8 service recomputes the expected fee on every submit and
 * compares it to the AO's entry. The frontend's `loan.notarialFee` /
 * `loan.docStamps` / `loan.insurance` are *never* trusted — the
 * backend always re-derives them from the product rule.
 *
 * ```csharp
 * // LoanApplicationService.SubmitAsync — pseudocode
 *
 * var product = await _loanProductRepository.GetByIdAsync(request.ProductId)
 *     ?? throw new NotFoundException("Product not found.");
 *
 * foreach (var feeRule in product.Fees)
 * {
 *     decimal actual = feeRule.FeeCode switch
 *     {
 *         FeeCode.NOTARIAL_FEE => request.NotarialFee,
 *         FeeCode.DOC_STAMPS   => request.DocStamps,
 *         FeeCode.INSURANCE    => request.Insurance,
 *         _ => throw new InvalidOperationException("Unknown fee code."),
 *     };
 *
 *     decimal expected = feeRule.FeeType == FeeType.PERCENTAGE
 *         ? Math.Round(request.LoanAmount * (feeRule.Rate / 100m), 2)
 *         : feeRule.DefaultValue;
 *
 *     if (Math.Abs(actual - expected) > feeRule.MaxAllowedDeviation)
 *     {
 *         if (string.IsNullOrWhiteSpace(request.FeeDeviationJustification))
 *             throw new ValidationException(
 *                 $"{feeRule.FeeCode} deviation requires a justification.");
 *
 *         // Otherwise the override is allowed and we audit it.
 *     }
 * }
 * ```
 *
 * ---
 *
 * ## 2. Audit trail — store actual + standard
 *
 * The `LoanApplication` entity keeps BOTH the AO's entry and the bank's
 * standard value. Compliance runs "AO Override Frequency" reports from
 * this delta to detect training gaps and fraud patterns.
 *
 * ```csharp
 * public class LoanApplication
 * {
 *     // ...existing fields...
 *
 *     public decimal NotarialFee       { get; set; }   // what the AO typed
 *     public decimal DocStamps         { get; set; }   // what the AO typed
 *     public decimal Insurance         { get; set; }   // what the AO typed
 *
 *     public decimal StandardNotarialFee { get; set; } // policy at entry time
 *     public decimal StandardDocStamps    { get; set; }
 *     public decimal StandardInsurance    { get; set; }
 *
 *     public string? FeeDeviationJustification { get; set; }
 * }
 *
 * // In SubmitAsync, after the override check above:
 * entity.NotarialFee         = request.NotarialFee;
 * entity.StandardNotarialFee = expectedForNotarial; // captured BEFORE the entry
 * // ...repeat for DocStamps / Insurance
 * ```
 *
 * ---
 *
 * ## 3. Immutability of rules — store in `LoanProduct`, not in code
 *
 * The fee rules (`DefaultNotarialFee`, `Rate`, `MaxAllowedDeviation`)
 * live in `dbo.loan_product_fee_rules` (or equivalent), keyed by
 * `(productId, feeCode)`. Compliance edits rows; the service reads
 * them. NO fee constant is hardcoded in C# source.
 *
 * ```csharp
 * // LoanProduct entity — backend owns this
 * public class LoanProduct
 * {
 *     public int    Id               { get; set; }
 *     public string Code             { get; set; } = "";
 *     public string Description      { get; set; } = "";
 *     public bool   IsActive         { get; set; }
 *     public List<LoanProductFeeRule> Fees { get; set; } = new();
 * }
 *
 * public class LoanProductFeeRule
 * {
 *     public int     Id                  { get; set; }
 *     public int     ProductId           { get; set; }
 *     public FeeCode FeeCode             { get; set; }   // enum: NOTARIAL_FEE / DOC_STAMPS / INSURANCE
 *     public FeeType FeeType             { get; set; }   // enum: FLAT / PERCENTAGE
 *     public decimal DefaultValue        { get; set; }   // for FLAT
 *     public decimal Rate                { get; set; }   // for PERCENTAGE (0-100)
 *     public decimal MaxAllowedDeviation { get; set; }   // absolute ₱
 * }
 * ```
 *
 * ---
 *
 * ## 4. Endpoint
 *
 * ```
 * GET  /api/loan-products?isActive=true&code=PL
 *      → 200 ApiResponse<LoanProductsResponse> { items: LoanProductResponse[] }
 *
 * POST /api/loan-applications  (body: LoanApplicationCreateRequest)
 *      → 200 ApiResponse<LoanApplicationResponse>
 *      → 400 ApiResponse with `errors[]` if validation fails (incl. fee deviation)
 * ```
 *
 * Mirrored on the frontend in `src/lib/api/loan-products.ts` and
 * `src/lib/api/types.ts` (`LoanProductResponse`, `LoanProductFeeRule`).
 *
 * ---
 *
 * ## 5. Why a separate "Standard snapshot" on the application
 *
 * The frontend stores `loan.standardFeesSnapshot` on the form so the
 * Zod gate can detect overrides *without* re-fetching the product
 * rules on submit (which could have changed in the interim). The
 * backend captures the same numbers authoritatively into
 * `StandardNotarialFee` / `StandardDocStamps` / `StandardInsurance`
 * at submit time. Both copies are stored so:
 *
 *   - The UI's "Reset to standard" / "X deviates from standard" cues
 *     match what the AO saw at entry time (the snapshot).
 *   - Compliance reports compare the *bank policy at entry* against
 *     the AO's actual entry, not against whatever the policy table
 *     says today (which would silently bias long-running reports).
 *
 * ---
 *
 * ## 6. CSRF / auth
 *
 * The endpoint must enforce:
 *   - `Bearer <access JWT>` (Authorization header, attached by
 *     `apiClient`'s request interceptor).
 *   - `X-XSRF-TOKEN` matching the JWT's `XsrfToken` claim (the
 *     `CsrfValidationMiddleware` runs on all non-GET/HEAD/OPTIONS).
 *   - `loans.create` permission on the calling user.
 *
 * The frontend already attaches all three — see `src/lib/apiClient.ts`.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import type { LoanProductResponse } from "@/src/lib/api/types";

// `LoanProductResponse` is imported here so the type checker validates
// the FE mirror of the backend DTO every time this file is compiled.
// (The actual contract lives in `src/lib/api/types.ts` — the C# spec
// above is the doc; this is just a typed anchor.)
export type _LoanProductResponse = LoanProductResponse;

