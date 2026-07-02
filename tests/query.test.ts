import { describe, expect, it } from "vitest";
import { compileScenario } from "../src/engine/data/compileScenario";
import { defaultScenario } from "../src/engine/data/defaultScenario";
import { prepareScenario } from "../src/engine/data/prepareScenario";
import { buildQueryResponse } from "../src/engine/simulation/query";
import { simulateScenario } from "../src/engine/simulation/simulator";

describe("frame query", () => {
  it("returns only active enemies at the requested frame", () => {
    const result = simulateScenario(compileScenario(prepareScenario(defaultScenario)));
    const response = buildQueryResponse(result, 0);
    expect(response.text).toContain("\u3010\u67e5\u8be2\u65f6\u95f4\uff1a0\u79d20\u5e27\u3011");
    expect(response.text).toContain("\u666e\u901a\u5175#1");
    expect(response.text).not.toContain("\u51b2\u950b\u624b");
  });
});
