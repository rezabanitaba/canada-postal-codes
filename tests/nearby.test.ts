import { describe, expect, it } from "vitest";

import { boundingBox, lookup, nearby } from "../src/index.js";

describe("nearby", () => {
  it("returns only records within the requested radius, nearest first", () => {
    const origin = lookup("V6B1A1")!;
    const results = nearby(origin.latitude, origin.longitude, 5);

    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.distanceKm).toBeLessThanOrEqual(5);
    }
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.distanceKm).toBeGreaterThanOrEqual(results[i - 1]!.distanceKm);
    }
  });

  it("includes the origin postal code itself at distance ~0", () => {
    const origin = lookup("V6B1A1")!;
    const results = nearby(origin.latitude, origin.longitude, 1);
    expect(results.some((r) => r.postalCode === "V6B 1A1")).toBe(true);
  });

  it("returns an empty array when nothing is within radius", () => {
    // Middle of the Pacific Ocean.
    expect(nearby(0, -140, 10)).toEqual([]);
  });

  it("shrinks as the radius shrinks", () => {
    const origin = lookup("V6B1A1")!;
    const wide = nearby(origin.latitude, origin.longitude, 10);
    const narrow = nearby(origin.latitude, origin.longitude, 1);
    expect(narrow.length).toBeLessThanOrEqual(wide.length);
  });
});

describe("boundingBox", () => {
  it("returns only records within the box", () => {
    const results = boundingBox(49.28, -123.15, 49.3, -123.1);
    expect(results.length).toBeGreaterThan(0);
    for (const record of results) {
      expect(record.latitude).toBeGreaterThanOrEqual(49.28);
      expect(record.latitude).toBeLessThanOrEqual(49.3);
      expect(record.longitude).toBeGreaterThanOrEqual(-123.15);
      expect(record.longitude).toBeLessThanOrEqual(-123.1);
    }
  });

  it("returns an empty array for a box with no records", () => {
    expect(boundingBox(0, -140, 0.01, -139.99)).toEqual([]);
  });
});
