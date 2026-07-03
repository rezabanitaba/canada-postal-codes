import { describe, expect, it } from "vitest";

import { searchByCity, searchByProvince } from "../src/index.js";

describe("searchByCity", () => {
  it("returns every record for a city, case-insensitively", () => {
    const upper = searchByCity("VANCOUVER");
    const lower = searchByCity("vancouver");
    const mixed = searchByCity("Vancouver");

    expect(upper.length).toBeGreaterThan(0);
    expect(lower.length).toBe(upper.length);
    expect(mixed.length).toBe(upper.length);
    for (const record of upper) {
      expect(record.city).toBe("VANCOUVER");
    }
  });

  it("returns an exact single record for a rare city", () => {
    const results = searchByCity("Marysvale");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ postalCode: "A0A 2Z0", city: "MARYSVALE", province: "NL" });
  });

  it("returns an empty array for unknown cities", () => {
    expect(searchByCity("Not A Real City")).toEqual([]);
  });

  it("tolerates surrounding whitespace", () => {
    expect(searchByCity("  Vancouver  ").length).toBeGreaterThan(0);
  });
});

describe("searchByProvince", () => {
  it("returns every record for a province abbreviation", () => {
    const results = searchByProvince("BC");
    expect(results.length).toBe(122_333);
    for (const record of results) {
      expect(record.province).toBe("BC");
    }
  });

  it("is case-insensitive", () => {
    expect(searchByProvince("bc").length).toBe(searchByProvince("BC").length);
  });

  it("returns an empty array for unknown provinces", () => {
    expect(searchByProvince("ZZ")).toEqual([]);
  });
});
