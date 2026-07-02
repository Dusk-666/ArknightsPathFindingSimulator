import type { ScenarioInput } from "../models";

export const defaultScenario: ScenarioInput = {
  map: {
    width: 12,
    height: 8,
    tiles: [
      { cell: "D2", terrain: "GROUND_BLOCK" },
      { cell: "E2", terrain: "GROUND_BLOCK" },
      { cell: "F2", terrain: "GROUND_BLOCK" },
      { cell: "G2", terrain: "GROUND_BLOCK" },
      { cell: "D4", terrain: "GROUND_BLOCK" },
      { cell: "D5", terrain: "GROUND_BLOCK" },
      { cell: "E5", terrain: "GROUND_BLOCK" },
      { cell: "I4", terrain: "GROUND_BLOCK" },
      { cell: "I5", terrain: "GROUND_BLOCK" },
      { cell: "J4", terrain: "GROUND_BLOCK" },
      { cell: "F4", terrain: "OBSTACLE", obstacle_cost: 1000 },
      { cell: "G4", terrain: "OBSTACLE", obstacle_cost: 1000 },
      { cell: "G6", terrain: "HIGH_COST_OBSTACLE", obstacle_cost: 1400 },
      { cell: "H6", terrain: "OBSTACLE", obstacle_cost: 1000 },
      { cell: "B7", terrain: "GROUND_BLOCK" },
      { cell: "C7", terrain: "GROUND_BLOCK" },
      { cell: "I2", terrain: "FLY_BLOCK" },
      { cell: "J2", terrain: "FLY_BLOCK" },
      { cell: "I3", terrain: "FLY_BLOCK" },
      { cell: "J3", terrain: "FLY_BLOCK" }
    ]
  },
  routes: [
    {
      id: "route_top",
      name: "\u4e0a\u8def\u7ed5\u884c",
      move_mode: "ground",
      allowDiagonalMove: true,
      visitEveryTileCenter: false,
      visitEveryNodeCenter: false,
      visitEveryNodeStably: false,
      visitEveryCheckPoint: false,
      ignoreAllButMoveCp: false,
      start_point: "A3",
      spawn_offset: [0, 0],
      end_point: "K6",
      checkpoints: [
        { id: "route_top_cp_1", type: "MOVE", target: "C3", offset: [0, 0] },
        { id: "route_top_cp_2", type: "MOVE", target: "C6", offset: [0, 0] },
        { id: "route_top_cp_3", type: "WAIT_FOR_SECONDS", seconds: 0.8 },
        { id: "route_top_cp_4", type: "MOVE", target: "H5", offset: [0, 0] }
      ]
    },
    {
      id: "route_low",
      name: "\u4e0b\u8def\u63a8\u8fdb",
      move_mode: "ground",
      allowDiagonalMove: false,
      visitEveryTileCenter: false,
      visitEveryNodeCenter: true,
      visitEveryNodeStably: false,
      visitEveryCheckPoint: true,
      ignoreAllButMoveCp: false,
      start_point: "A8",
      spawn_offset: [0, 0],
      end_point: "L4",
      checkpoints: [
        { id: "route_low_cp_1", type: "MOVE", target: "D8", offset: [0, 0] },
        { id: "route_low_cp_2", type: "PATROL_MOVE", target: "H8", offset: [0, 0] },
        { id: "route_low_cp_3", type: "MOVE", target: "J6", offset: [0, 0] }
      ]
    }
  ],
  enemy_types: [
    {
      id: "enemy_grunt",
      name: "\u666e\u901a\u5175",
      move_mode_override: null,
      attribute_speed: 2.8,
      moveMultiplier: 1,
      steeringFactor: 16,
      maxSteeringForce: 30,
      halfBodyWidth: 0.2,
      footOffset: [0, 0.22],
      cursor_offset: [0, 0]
    },
    {
      id: "enemy_runner",
      name: "\u51b2\u950b\u624b",
      move_mode_override: null,
      attribute_speed: 3.8,
      moveMultiplier: 1.12,
      steeringFactor: 20,
      maxSteeringForce: 36,
      halfBodyWidth: 0.18,
      footOffset: [0, 0.18],
      cursor_offset: [0, 0]
    }
  ],
  spawn_events: [
    {
      id: "spawn_001",
      time: "0\u79d20\u5e27",
      enemy_type_id: "enemy_grunt",
      route_id: "route_top",
      count: 1,
      interval_frames: 0
    },
    {
      id: "spawn_002",
      time: "2\u79d210\u5e27",
      enemy_type_id: "enemy_runner",
      route_id: "route_top",
      count: 3,
      interval_frames: 8
    },
    {
      id: "spawn_003",
      time: "4\u79d20\u5e27",
      enemy_type_id: "enemy_grunt",
      route_id: "route_low",
      count: 4,
      interval_frames: 10
    },
    {
      id: "spawn_004",
      time: "7\u79d215\u5e27",
      enemy_type_id: "enemy_runner",
      route_id: "route_low",
      count: 2,
      interval_frames: 12
    }
  ]
};

export const defaultScenarioJson = JSON.stringify(defaultScenario, null, 2);
