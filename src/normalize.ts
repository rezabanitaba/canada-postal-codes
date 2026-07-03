/**
 * Normalizes a postal code to its canonical, space-free, uppercase form.
 *
 * Every lookup in this library normalizes its input first, so `"v6b1a1"`,
 * `"V6B 1A1"`, and `"V6B1A1"` all resolve to the same record.
 *
 * @example
 * normalize("v6b 1a1"); // "V6B1A1"
 */
export function normalize(postalCode: string): string {
  return postalCode.replace(/\s+/g, "").toUpperCase();
}

/** Canadian postal codes follow an alternating letter-digit-letter-digit-letter-digit shape. */
export const POSTAL_CODE_SHAPE = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;

/** Returns true when `postalCode` normalizes to a well-formed Canadian postal code shape. */
export function isValidPostalCodeFormat(postalCode: string): boolean {
  return POSTAL_CODE_SHAPE.test(normalize(postalCode));
}
