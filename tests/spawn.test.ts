import { describe, expect, it } from "vitest";
import { expandSpawnEvents, expandSpawnEventFrames } from "../src/engine/data/spawnExpansion";
import { prepareScenario } from "../src/engine/data/prepareScenario";
import { defaultScenario } from "../src/engine/data/defaultScenario";
import { expandSpawnFrames } from "../src/editor/models/spawnEventModel";

describe("spawn event expansion", () => {
  it("expands scenario spawn_events into unique enemy instances", () => {
    const draft = prepareScenario(defaultScenario);
    const expanded = expandSpawnEvents(draft.enemyTypes, draft.routes, draft.spawnEvents);

    expect(expanded.length).toBe(10);
    expect(expanded[0].displayName).toBe("\u666e\u901a\u5175#1");
    expect(expanded[1].displayName).toBe("\u51b2\u950b\u624b#1");
    expect(new Set(expanded.map((enemy) => enemy.id)).size).toBe(expanded.length);
  });

  it("expands batch event frames correctly in both engine and timeline editor helpers", () => {
    const event = {
      id: "spawn_test",
      time: "12\u79d28\u5e27",
      enemy_type_id: "enemy_grunt",
      route_id: "route_top",
      count: 3,
      interval_frames: 10
    };

    const editorFrames = expandSpawnFrames(event);
    expect(editorFrames).toEqual([368, 378, 388]);

    const engineFrames = expandSpawnEventFrames({
      spawnFrame: 368,
      count: 3,
      intervalFrames: 10
    });
    expect(engineFrames).toEqual(editorFrames);
  });
});
