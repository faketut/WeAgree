/** Maximum allowed encoded length of a signature data URI on the server (1.5 MB). */
export const MAX_SIGNATURE_DATA_URI_BYTES = 1_572_864; // 1.5 MB

const ALLOWED_PREFIXES = ["data:image/png;", "data:image/jpeg;"];

/**
 * Validate a user-supplied signature value. The signature may be:
 *  - a typed/drawn signature (plain string), or
 *  - a base64 data URI (`data:image/png;base64,...` or `data:image/jpeg;base64,...`).
 *
 * Returns `{ ok: true }` if the input is allowed; `{ ok: false, error }` otherwise.
 */
export function validateSignatureDisplay(value: string): { ok: true } | { ok: false; error: string } {
    if (typeof value !== "string" || !value) {
        return { ok: false, error: "Signature is required." };
    }
    if (!value.startsWith("data:")) {
        // Plain typed/drawn signature — limit overall length to keep DB rows sane.
        if (value.length > 4096) return { ok: false, error: "Signature text is too long." };
        return { ok: true };
    }
    if (!ALLOWED_PREFIXES.some((p) => value.startsWith(p))) {
        return { ok: false, error: "Only PNG or JPG signature images are accepted." };
    }
    if (value.length > MAX_SIGNATURE_DATA_URI_BYTES) {
        return { ok: false, error: "Signature image exceeds the 1 MB limit." };
    }
    return { ok: true };
}
