import { describe, expect, it } from "vitest";
import { formatFrameCount, parseTimeString } from "../src/engine/utils/time";

describe("time helpers", () => {
  it("parses fixed 30fps time strings", () => {
    expect(parseTimeString("3\u79d215\u5e27")).toBe(105);
    expect(parseTimeString("0\u79d20\u5e27")).toBe(0);
  });

  it("formats total frames back to time text", () => {
    expect(formatFrameCount(105)).toBe("3\u79d215\u5e27");
    expect(formatFrameCount(29)).toBe("0\u79d229\u5e27");
  });

  it("rejects invalid frame counts", () => {
    expect(() => parseTimeString("1\u79d230\u5e27")).toThrow();
  });
});
