import { describe, expect, it } from "vitest";
import { parseCell, pointToCell, worldToOwnedGrid } from "../src/engine/utils/cells";
import { bankersRound } from "../src/engine/utils/rounding";

describe("cell helpers", () => {
  it("converts between cell names and grid coordinates", () => {
    expect(parseCell("A1")).toEqual({ x: 0, y: 0 });
    expect(parseCell("C4")).toEqual({ x: 2, y: 3 });
    expect(pointToCell({ x: 2, y: 3 })).toBe("C4");
  });

  it("uses bankers rounding for ownership", () => {
    expect(bankersRound(2.5)).toBe(2);
    expect(bankersRound(3.5)).toBe(4);
    expect(bankersRound(-1.5)).toBe(-2);
    expect(worldToOwnedGrid({ x: 2.5, y: 3.5 })).toEqual({ x: 2, y: 4 });
  });
});
