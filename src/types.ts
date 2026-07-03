/**
 * A single Canadian postal code record.
 */
export interface PostalCodeRecord {
  /** Formatted postal code, e.g. "V6B 1A1". */
  postalCode: string;
  /** Uppercased city/municipality name, e.g. "VANCOUVER". */
  city: string;
  /** Two-letter province/territory abbreviation, e.g. "BC". */
  province: string;
  latitude: number;
  longitude: number;
  /** Raw UTC offset in hours, as sourced from the dataset. */
  timezone: number;
}

/** A {@link PostalCodeRecord} annotated with its distance from a query point. */
export interface NearbyResult extends PostalCodeRecord {
  distanceKm: number;
}
