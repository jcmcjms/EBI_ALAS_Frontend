


const STATIC_PRODUCT_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    C21: "ATM SAL",
    A16: "APDS - RPSU",
    A17: "APDS - EMP",
    C02: "AUX",
};


const CLASS_SCOPED_PRODUCT_CODES: ReadonlySet<string> = new Set(["C23", "C35"]);


const CAT_LOAN_CLASS_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    "971": "BONUS / YEB",
    "935": "BONUS / MYB",
};

const SEPARATOR = " - ";


export function parseProductCode(
    productWithDescription: string | null | undefined
): string {
    const value = (productWithDescription ?? "").trim();
    if (!value) return "";
    const separatorIndex = value.indexOf(SEPARATOR);
    return (separatorIndex === -1 ? value : value.slice(0, separatorIndex)).trim();
}


export function isClassScopedProduct(
    productCode: string | null | undefined
): boolean {
    return CLASS_SCOPED_PRODUCT_CODES.has((productCode ?? "").trim());
}


export function resolveLoanProductDisplayName(
    productWithDescription: string | null | undefined,
    catLoanClass: string | null | undefined
): string {
    const raw = (productWithDescription ?? "").trim();
    const code = parseProductCode(raw);
    if (!code) return "";

    
    
    const normalizedClass = (catLoanClass ?? "").trim() || undefined;

    const displayName = isClassScopedProduct(code)
        ? (normalizedClass ? CAT_LOAN_CLASS_DISPLAY_NAMES[normalizedClass] : undefined)
        : STATIC_PRODUCT_DISPLAY_NAMES[code];

    return (displayName ?? raw) || code;
}
