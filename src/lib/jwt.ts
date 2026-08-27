/**
 * Decode a JWT token payload (no signature verification — that's the backend's job).
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

/**
 * Extract a UserSession-compatible object from a decoded JWT.
 */
export interface JwtUserSession {
    userId: string;
    firstName: string;
    middleName: string;
    lastName: string;
    branchId: string;
    role: string;
    permissions: string[];
    mustChangePassword: boolean;
}

export function extractUserFromToken(token: string): JwtUserSession | null {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    // Collect all "permission" claims (backend emits multiple Claim("permission", ...))
    // When multiple claims share the same key, JWT serialization produces a JSON array.
    const permissions: string[] = [];
    for (const [key, value] of Object.entries(payload)) {
        if (key === 'permission') {
            if (typeof value === 'string') {
                permissions.push(value);
            } else if (Array.isArray(value)) {
                permissions.push(...value.filter((v): v is string => typeof v === 'string'));
            }
        }
    }

    // Handle boolean claim properly - avoid JS "false" === true trap
    const mustChangePassword = payload.mustChangePassword === true || String(payload.mustChangePassword) === "true";

    return {
        userId: String(payload.userId ?? ''),
        firstName: String(payload.firstName ?? ''),
        middleName: String(payload.middleName ?? ''),
        lastName: String(payload.lastName ?? ''),
        branchId: String(payload.branchId ?? ''),
        role: String(payload.role ?? ''),
        permissions,
        mustChangePassword,
    };
}
