/**
 * Display-name resolution for the approval form's "Loan Product" cell.
 *
 * The webloan `loan_product.description` ("APDS-RPSU 1-5YR_DIM") is an
 * internal ledger label, not the name the approval form prints. Products
 * have a curated display name keyed by `id_code`; C23/C35 additionally
 * depend on `loan_data.cat_loan_class` of the selected preloan row
 * (971 → BONUS / YEB, 935 → BONUS / MYB), resolved server-side via
 * GET /api/webloans/loan-class.
 */

/** Static display names keyed by webloan `loan_product.id_code`. */
const STATIC_PRODUCT_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    C21: "ATM SAL",
    A16: "APDS - RPSU",
    A17: "APDS - EMP",
    C02: "AUX",
};

/** Products whose name depends on `cat_loan_class` instead of being static. */
const CLASS_SCOPED_PRODUCT_CODES: ReadonlySet<string> = new Set(["C23", "C35"]);

/** `cat_loan_class` → display name for class-scoped products (C23/C35). */
const CAT_LOAN_CLASS_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    "971": "BONUS / YEB",
    "935": "BONUS / MYB",
};

const SEPARATOR = " - ";

/**
 * Extracts the bare product code from the backend's pre-joined
 * "<code> - <description>" string (e.g. "A16 - APDS-RPSU 1-5YR_DIM" → "A16").
 * Split on the FIRST separator only — descriptions themselves contain
 * dashes ("C21 - CL - Diminishing"). Falls back to the whole string when
 * no description joined (backend does that for retired/orphaned products).
 */
export function parseProductCode(
    productWithDescription: string | null | undefined
): string {
    const value = (productWithDescription ?? "").trim();
    if (!value) return "";
    const separatorIndex = value.indexOf(SEPARATOR);
    return (separatorIndex === -1 ? value : value.slice(0, separatorIndex)).trim();
}

/** True when the product's display name depends on `cat_loan_class`. */
export function isClassScopedProduct(
    productCode: string | null | undefined
): boolean {
    return CLASS_SCOPED_PRODUCT_CODES.has((productCode ?? "").trim());
}

/**
 * Resolves the approval-form display name, e.g. "APDS - RPSU" or
 * "BONUS / YEB".
 *
 * Fallback rule (deliberate, banking context): an unknown code, or a
 * class-scoped product whose `cat_loan_class` did not resolve (query in
 * flight, NULL column, 404 for the triple), renders the backend's own
 * "<code> - <description>" string. We never guess a bonus class — a wrong
 * YEB/MYB label on a printed approval form is worse than the legacy label.
 */
export function resolveLoanProductDisplayName(
    productWithDescription: string | null | undefined,
    catLoanClass: string | null | undefined
): string {
    const raw = (productWithDescription ?? "").trim();
    const code = parseProductCode(raw);
    if (!code) return "";

    const displayName = isClassScopedProduct(code)
        ? CAT_LOAN_CLASS_DISPLAY_NAMES[(catLoanClass ?? "").trim()]
        : STATIC_PRODUCT_DISPLAY_NAMES[code];

    return (displayName ?? raw) || code;
}
