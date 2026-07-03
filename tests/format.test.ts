import { describe, expect, it } from "vitest";

import { InvalidPostalCodeError } from "../src/errors.js";
import { format } from "../src/format.js";

describe("format", () => {
  it("inserts a space after the third character", () => {
    expect(format("V6B1A1")).toBe("V6B 1A1");
  });

  it("accepts lowercase and pre-spaced input", () => {
    expect(format("v6b1a1")).toBe("V6B 1A1");
    expect(format("V6B 1A1")).toBe("V6B 1A1");
    expect(format("v6b   1a1")).toBe("V6B 1A1");
  });

  it("throws InvalidPostalCodeError for malformed input", () => {
    expect(() => format("")).toThrow(InvalidPostalCodeError);
    expect(() => format("12345")).toThrow(InvalidPostalCodeError);
    expect(() => format("not-a-code")).toThrow(InvalidPostalCodeError);
    expect(() => format("AAAAAA")).toThrow(InvalidPostalCodeError);
  });
});
