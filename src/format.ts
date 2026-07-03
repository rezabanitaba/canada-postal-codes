import { InvalidPostalCodeError } from "./errors.js";
import { normalize, POSTAL_CODE_SHAPE } from "./normalize.js";

/**
 * Formats a postal code into its conventional "A1A 1A1" presentation.
 *
 * @throws {InvalidPostalCodeError} if the input does not normalize to a
 * well-formed Canadian postal code.
 *
 * @example
 * format("v6b1a1"); // "V6B 1A1"
 */
export function format(postalCode: string): string {
  const code = normalize(postalCode);
  if (!POSTAL_CODE_SHAPE.test(code)) {
    throw new InvalidPostalCodeError(postalCode);
  }
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
