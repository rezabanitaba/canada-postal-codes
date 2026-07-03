import { describe, expect, it } from "vitest";

import { haversineKm } from "../src/distance.js";
import { distance } from "../src/index.js";
import { PostalCodeNotFoundError } from "../src/errors.js";

describe("haversineKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineKm(49.283756, -123.106033, 49.283756, -123.106033)).toBe(0);
  });

  it("computes a known great-circle distance", () => {
    // Vancouver, BC <-> Toronto, ON is approximately 3,360 km.
    const km = haversineKm(49.283756, -123.106033, 43.688438, -79.307762);
    expect(km).toBeGreaterThan(3300);
    expect(km).toBeLessThan(3420);
  });
});

describe("distance", () => {
  it("computes the distance between two postal codes", () => {
    const km = distance("V6B1A1", "M4C1S9");
    expect(km).toBeGreaterThan(3300);
    expect(km).toBeLessThan(3420);
  });

  it("returns 0 for a postal code compared to itself", () => {
    expect(distance("V6B1A1", "v6b 1a1")).toBe(0);
  });

  it("throws PostalCodeNotFoundError when either postal code is unknown", () => {
    expect(() => distance("Z9Z 9Z9", "M4C1S9")).toThrow(PostalCodeNotFoundError);
    expect(() => distance("V6B1A1", "Z9Z 9Z9")).toThrow(PostalCodeNotFoundError);
  });
});
