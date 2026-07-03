import { describe, expect, it } from "vitest";

import { normalize } from "../src/normalize.js";

describe("normalize", () => {
  it("strips spaces and uppercases", () => {
    expect(normalize("V6B1A1")).toBe("V6B1A1");
    expect(normalize("v6b1a1")).toBe("V6B1A1");
    expect(normalize("v6b 1a1")).toBe("V6B1A1");
    expect(normalize("V6B 1A1")).toBe("V6B1A1");
  });

  it("collapses multiple/irregular whitespace", () => {
    expect(normalize("v6b   1a1")).toBe("V6B1A1");
    expect(normalize(" v6b1a1 ")).toBe("V6B1A1");
    expect(normalize("v6b\t1a1")).toBe("V6B1A1");
  });

  it("passes through malformed input untouched aside from case/whitespace", () => {
    expect(normalize("not-a-code")).toBe("NOT-A-CODE");
    expect(normalize("")).toBe("");
  });
});
