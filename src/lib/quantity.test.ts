import { describe, expect, it } from "vitest";
import { formatQuantity, parseQuantity, scaleQuantity } from "./quantity";

describe("parseQuantity", () => {
  it("parses plain integers and decimals", () => {
    expect(parseQuantity("2")).toBe(2);
    expect(parseQuantity("1.5")).toBe(1.5);
  });

  it("parses simple fractions", () => {
    expect(parseQuantity("1/4")).toBeCloseTo(0.25);
    expect(parseQuantity("2/3")).toBeCloseTo(2 / 3);
  });

  it("parses mixed numbers", () => {
    expect(parseQuantity("1 1/2")).toBeCloseTo(1.5);
    expect(parseQuantity("2 1/2")).toBeCloseTo(2.5);
  });

  it("parses unicode fractions, bare and mixed", () => {
    expect(parseQuantity("½")).toBeCloseTo(0.5);
    expect(parseQuantity("1¼")).toBeCloseTo(1.25);
  });

  it("returns null for non-numeric amounts", () => {
    expect(parseQuantity("to taste")).toBeNull();
    expect(parseQuantity("as needed")).toBeNull();
    expect(parseQuantity("pinch")).toBeNull();
    expect(parseQuantity("kitchen twine")).toBeNull();
  });

  it("returns null for ranges", () => {
    expect(parseQuantity("1-2")).toBeNull();
    expect(parseQuantity("8-10")).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("formats whole numbers with no fraction", () => {
    expect(formatQuantity(3)).toBe("3");
  });

  it("formats fractions alone", () => {
    expect(formatQuantity(0.25)).toBe("1/4");
    expect(formatQuantity(2 / 3)).toBe("2/3");
  });

  it("formats whole + fraction", () => {
    expect(formatQuantity(2.5)).toBe("2 1/2");
  });

  it("rounds a nearby decimal to the nearest nice fraction", () => {
    // 2 * (2/6) = 0.6667 -> nearest nice fraction is 2/3, not "0.67"
    expect(formatQuantity(2 * (2 / 6))).toBe("2/3");
    // 1 * (1/3) = 0.333 -> nearest nice fraction is 1/3, not "0.33"
    expect(formatQuantity(1 * (1 / 3))).toBe("1/3");
  });

  it("floors a nonzero value that rounds down to zero", () => {
    expect(formatQuantity(0.25 * (1 / 12))).toBe("1/8");
  });
});

describe("scaleQuantity", () => {
  it("scales decimal quantities into friendly fractions instead of raw decimals", () => {
    expect(scaleQuantity("2", 2 / 6)).toBe("2/3");
    expect(scaleQuantity("1", 1 / 3)).toBe("1/3");
  });

  it("scales fraction-stored quantities (previously frozen/unscaled)", () => {
    expect(scaleQuantity("1/4", 2)).toBe("1/2");
    expect(scaleQuantity("1/3", 3)).toBe("1");
  });

  it("scales mixed numbers", () => {
    expect(scaleQuantity("1 1/2", 2)).toBe("3");
  });

  it("reformats unscaled (factor 1) quantities nicely too", () => {
    expect(scaleQuantity("2.5", 1)).toBe("2 1/2");
  });

  it("passes non-numeric quantities through unchanged", () => {
    expect(scaleQuantity("to taste", 0.5)).toBe("to taste");
    expect(scaleQuantity("1-2", 2)).toBe("1-2");
  });

  it("floors instead of showing zero for very small scaled amounts", () => {
    expect(scaleQuantity("1/4", 1 / 12)).toBe("1/8");
  });
});
