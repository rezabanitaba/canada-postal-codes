import { haversineKm } from "./distance.js";
import { normalize } from "./normalize.js";
import { getDataset } from "./data-loader.js";
import { PostalCodeNotFoundError } from "./errors.js";
import type { NearbyResult, PostalCodeRecord } from "./types.js";

export type { PostalCodeRecord, NearbyResult } from "./types.js";
export { InvalidPostalCodeError, PostalCodeNotFoundError } from "./errors.js";
export { normalize } from "./normalize.js";
export { format } from "./format.js";

/**
 * Looks up a Canadian postal code.
 *
 * @returns The matching record, or `null` if the postal code is not in the
 * dataset (this includes malformed input, which can never match).
 *
 * @example
 * lookup("V6B1A1");
 * // { postalCode: "V6B 1A1", city: "VANCOUVER", province: "BC", ... }
 */
export function lookup(postalCode: string): PostalCodeRecord | null {
  const dataset = getDataset();
  const index = dataset.findIndex(normalize(postalCode));
  return index === -1 ? null : dataset.recordAt(index);
}

/** Returns whether `postalCode` exists in the dataset. */
export function exists(postalCode: string): boolean {
  return getDataset().findIndex(normalize(postalCode)) !== -1;
}

/** Returns every postal code record belonging to `city` (case-insensitive). */
export function searchByCity(city: string): PostalCodeRecord[] {
  const dataset = getDataset();
  const indices = dataset.cityToIndices.get(city.trim().toUpperCase());
  return indices ? indices.map((index) => dataset.recordAt(index)) : [];
}

/** Returns every postal code record for `province` (a two-letter abbreviation, e.g. "ON"). */
export function searchByProvince(province: string): PostalCodeRecord[] {
  const dataset = getDataset();
  const indices = dataset.provinceToIndices.get(province.trim().toUpperCase());
  return indices ? indices.map((index) => dataset.recordAt(index)) : [];
}

/**
 * Great-circle distance between two postal codes, in kilometers.
 *
 * @throws {PostalCodeNotFoundError} if either postal code is not in the dataset.
 */
export function distance(postalA: string, postalB: string): number {
  const a = lookup(postalA);
  if (!a) throw new PostalCodeNotFoundError(postalA);
  const b = lookup(postalB);
  if (!b) throw new PostalCodeNotFoundError(postalB);
  return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
}

/**
 * Returns every postal code record within `radiusKm` of a coordinate,
 * nearest first.
 */
export function nearby(latitude: number, longitude: number, radiusKm: number): NearbyResult[] {
  const dataset = getDataset();
  return dataset.spatialIndex
    .queryRadius(latitude, longitude, radiusKm)
    .map(({ index, distanceKm }) => ({ ...dataset.recordAt(index), distanceKm }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Returns every postal code record within an inclusive lat/lng bounding box. */
export function boundingBox(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
): PostalCodeRecord[] {
  const dataset = getDataset();
  return dataset.spatialIndex
    .queryBoundingBox(minLat, minLng, maxLat, maxLng)
    .map((index) => dataset.recordAt(index));
}

/** Returns a random postal code record from the dataset. */
export function random(): PostalCodeRecord {
  const dataset = getDataset();
  const index = Math.floor(Math.random() * dataset.count);
  return dataset.recordAt(index);
}

/**
 * Finds the closest other postal code to `postalCode`.
 *
 * @throws {PostalCodeNotFoundError} if `postalCode` is not in the dataset.
 * @returns The nearest record (annotated with `distanceKm`), or `null` if no
 * other postal code could be found (only possible on a near-empty dataset).
 */
export function nearest(postalCode: string): NearbyResult | null {
  const origin = lookup(postalCode);
  if (!origin) throw new PostalCodeNotFoundError(postalCode);

  const originCode = normalize(postalCode);
  const maxRadiusKm = 2500; // comfortably spans the width of Canada
  for (let radiusKm = 5; radiusKm <= maxRadiusKm; radiusKm *= 2) {
    const candidates = nearby(origin.latitude, origin.longitude, radiusKm).filter(
      (candidate) => normalize(candidate.postalCode) !== originCode,
    );
    if (candidates.length > 0) {
      return candidates[0]!;
    }
  }
  return null;
}
