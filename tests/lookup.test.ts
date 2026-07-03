import { describe, expect, it } from "vitest";

import { exists, lookup } from "../src/index.js";

describe("lookup", () => {
  it("returns the record for a known postal code", () => {
    const record = lookup("V6B1A1");
    expect(record).not.toBeNull();
    expect(record).toMatchObject({
      postalCode: "V6B 1A1",
      city: "VANCOUVER",
      province: "BC",
    });
    expect(record!.latitude).toBeCloseTo(49.283756, 4);
    expect(record!.longitude).toBeCloseTo(-123.106033, 4);
    expect(record!.timezone).toBe(8);
  });

  it("accepts lowercase input", () => {
    expect(lookup("v6b1a1")).toMatchObject({ city: "VANCOUVER", province: "BC" });
  });

  it("accepts spacing variations", () => {
    expect(lookup("V6B 1A1")).toMatchObject({ city: "VANCOUVER" });
    expect(lookup("v6b   1a1")).toMatchObject({ city: "VANCOUVER" });
    expect(lookup(" V6B1A1 ")).toMatchObject({ city: "VANCOUVER" });
  });

  it("resolves a second, independently-sourced record", () => {
    const record = lookup("M4C 1S9");
    expect(record).toMatchObject({ postalCode: "M4C 1S9", city: "TORONTO", province: "ON" });
    expect(record!.latitude).toBeCloseTo(43.688438, 4);
    expect(record!.longitude).toBeCloseTo(-79.307762, 4);
  });

  it("returns null for unknown or malformed postal codes", () => {
    expect(lookup("Z9Z 9Z9")).toBeNull();
    expect(lookup("not-a-code")).toBeNull();
    expect(lookup("12345")).toBeNull();
    expect(lookup("")).toBeNull();
  });
});

describe("exists", () => {
  it("returns true for known postal codes, in any casing/spacing", () => {
    expect(exists("V6B1A1")).toBe(true);
    expect(exists("v6b 1a1")).toBe(true);
    expect(exists("V6B   1A1")).toBe(true);
  });

  it("returns false for unknown or malformed postal codes", () => {
    expect(exists("Z9Z 9Z9")).toBe(false);
    expect(exists("not-a-code")).toBe(false);
    expect(exists("")).toBe(false);
  });
});
