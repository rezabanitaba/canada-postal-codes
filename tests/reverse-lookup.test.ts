import { describe, expect, it } from "vitest";

import { lookup, reverseLookup } from "../src/index.js";

describe("reverseLookup", () => {
  it("finds the closest postal code to a coordinate", () => {
    const origin = lookup("V6B1A1")!;
    const result = reverseLookup(origin.latitude, origin.longitude);
    expect(result).not.toBeNull();
    expect(result!.postalCode).toBe("V6B 1A1");
    expect(result!.distanceKm).toBeCloseTo(0, 2);
  });

  it("finds the closest postal code even far from any record", () => {
    const result = reverseLookup(49.3, -123.2);
    expect(result).not.toBeNull();
    expect(result!.distanceKm).toBeGreaterThan(0);
  });
});
