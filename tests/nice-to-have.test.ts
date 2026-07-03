import { describe, expect, it } from "vitest";

import { exists, nearest, random } from "../src/index.js";
import { PostalCodeNotFoundError } from "../src/errors.js";

describe("random", () => {
  it("returns a valid, existing record", () => {
    const record = random();
    expect(exists(record.postalCode)).toBe(true);
  });

  it("can return different records across calls", () => {
    const samples = new Set(Array.from({ length: 20 }, () => random().postalCode));
    expect(samples.size).toBeGreaterThan(1);
  });
});

describe("nearest", () => {
  it("finds a different, closest postal code", () => {
    const result = nearest("V6B1A1");
    expect(result).not.toBeNull();
    expect(result!.postalCode).not.toBe("V6B 1A1");
    expect(result!.distanceKm).toBeGreaterThan(0);
  });

  it("throws PostalCodeNotFoundError for an unknown postal code", () => {
    expect(() => nearest("Z9Z 9Z9")).toThrow(PostalCodeNotFoundError);
  });
});
