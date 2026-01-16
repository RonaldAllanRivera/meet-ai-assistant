export const FAMILY_KEY_HEADER = "x-family-key";
export const FAMILY_KEY_HEADER_NAME = "X-Family-Key";

export function getFamilyKey(headers: Record<string, unknown>): string | null {
  const raw = headers[FAMILY_KEY_HEADER];
  if (Array.isArray(raw)) {
    const first = raw[0];
    return typeof first === "string" ? first.trim() || null : null;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export function verifyFamilyKey(
  headers: Record<string, unknown>,
  expected: string | undefined
): boolean {
  if (!expected) return true;
  const provided = getFamilyKey(headers);
  return Boolean(provided && provided === expected);
}
