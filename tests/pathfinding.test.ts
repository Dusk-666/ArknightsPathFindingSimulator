import { describe, expect, it } from "vitest";
import { compileScenario } from "../src/engine/data/compileScenario";
import { prepareScenario } from "../src/engine/data/prepareScenario";
import type { ScenarioInput } from "../src/engine/models";
import { canStraightConnect } from "../src/engine/pathfinding/bresenham";
import { buildReversePathMap, flattenPathMap } from "../src/engine/pathfinding/reversePathMap";
import { pointToCell } from "../src/engine/utils/cells";

const scenario: ScenarioInput = {
  map: {
    width: 6,
    height: 5,
    tiles: [
      { cell: "C2", terrain: "GROUND_BLOCK" },
      { cell: "C3", terrain: "OBSTACLE", obstacle_cost: 1000 }
    ]
  },
  routes: [
    {
      id: "r1",
      name: "\u6d4b\u8bd5\u8def\u7ebf",
      move_mode: "ground",
      allowDiagonalMove: true,
      start_point: "A2",
      end_point: "F4",
      checkpoints: [{ type: "MOVE", target: "B4", offset: [0, 0] }]
    }
  ],
  enemy_types: [],
  spawn_events: []
};

describe("reverse BFS path map", () => {
  it("builds distanceToTarget and nextNode from the target backwards", () => {
    const prepared = prepareScenario(scenario);
    const pathMap = buildReversePathMap(prepared.map, "ground", "F4", "test");
    expect(pathMap.nodes.A2.distanceToTarget).toBeGreaterThan(0);
    expect(pointToCell(pathMap.nodes.E4.nextNode)).toBe("F4");
    expect(pathMap.nodes.C2.distanceToTarget).toBe(Number.POSITIVE_INFINITY);
    expect(pointToCell(pathMap.nodes.C2.nextNode)).toBe("C2");
  });

  it("keeps flattening links legal", () => {
    const prepared = prepareScenario(scenario);
    const raw = buildReversePathMap(prepared.map, "ground", "F4", "test");
    const flattened = flattenPathMap(raw, prepared.map);
    Object.values(flattened.nodes).forEach((node) => {
      if (pointToCell(node.nextNode) === pointToCell(node.cell)) {
        return;
      }

      expect(canStraightConnect(prepared.map, "ground", node.cell, node.nextNode)).toBe(true);
    });
  });

  it("prefers a direct diagonal nextNode when the corner is clear", () => {
    const diagonalScenario: ScenarioInput = {
      map: {
        width: 2,
        height: 2,
        tiles: []
      },
      routes: [
        {
          id: "diag",
          name: "Diagonal",
          move_mode: "ground",
          allowDiagonalMove: true,
          start_point: "A1",
          end_point: "B2",
          checkpoints: []
        }
      ],
      enemy_types: [],
      spawn_events: []
    };

    const prepared = prepareScenario(diagonalScenario);
    const raw = buildReversePathMap(prepared.map, "ground", "B2", "diag");
    const flattened = flattenPathMap(raw, prepared.map);

    expect(canStraightConnect(prepared.map, "ground", { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(true);
    expect(pointToCell(flattened.nodes.A1.nextNode)).toBe("B2");
  });

  it("backfills distanceToEnd for checkpoint maps", () => {
    const prepared = compileScenario(prepareScenario(scenario));
    const route = prepared.routes.r1;
    const firstMap = prepared.pathMaps[route.pathSequence[0].id];
    expect(firstMap.nodes.A2.distanceToEnd).toBeGreaterThan(firstMap.nodes.A2.distanceToTarget);
  });
});
