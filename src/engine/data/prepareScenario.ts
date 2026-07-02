import type {
  CheckpointInput,
  MoveMode,
  NormalizedCheckpoint,
  NormalizedEnemyType,
  NormalizedMap,
  NormalizedRoute,
  NormalizedSpawnEvent,
  ScenarioDraft,
  ScenarioInput,
  TerrainType,
  TileInput,
  Vec2
} from "../models";
import { cellCenter, parseCell, pointToCell } from "../utils/cells";
import { parseTimeString } from "../utils/time";

function normalizeVector(input?: [number, number]): Vec2 {
  return {
    x: input?.[0] ?? 0,
    y: input?.[1] ?? 0
  };
}

function resolveTileTerrain(tile: TileInput | undefined): TerrainType {
  if (!tile) {
    return "NORMAL";
  }

  if (tile.terrain) {
    return tile.terrain;
  }

  if (tile.obstacle) {
    return (tile.obstacle_cost ?? 1000) > 1000 ? "HIGH_COST_OBSTACLE" : "OBSTACLE";
  }

  if (tile.ground_passable === false) {
    return "GROUND_BLOCK";
  }

  if (tile.fly_passable === false) {
    return "FLY_BLOCK";
  }

  return "NORMAL";
}

function getTerrainFlags(terrain: TerrainType, obstacleCost?: number) {
  switch (terrain) {
    case "GROUND_BLOCK":
      return {
        groundPassable: false,
        flyPassable: true,
        obstacle: false,
        obstacleCost: 1
      };
    case "FLY_BLOCK":
      return {
        groundPassable: true,
        flyPassable: false,
        obstacle: false,
        obstacleCost: 1
      };
    case "OBSTACLE":
      return {
        groundPassable: true,
        flyPassable: true,
        obstacle: true,
        obstacleCost: obstacleCost ?? 1000
      };
    case "HIGH_COST_OBSTACLE":
      return {
        groundPassable: true,
        flyPassable: true,
        obstacle: true,
        obstacleCost: obstacleCost ?? 1600
      };
    case "NORMAL":
    default:
      return {
        groundPassable: true,
        flyPassable: true,
        obstacle: false,
        obstacleCost: 1
      };
  }
}

function normalizeCheckpoint(routeId: string, checkpoint: CheckpointInput, checkpointIndex: number): NormalizedCheckpoint {
  const offset = normalizeVector(checkpoint.offset);
  const id = checkpoint.id ?? `${routeId}:cp:${checkpointIndex + 1}`;

  if (checkpoint.type === "WAIT_FOR_SECONDS") {
    return {
      id,
      type: checkpoint.type,
      offset,
      seconds: checkpoint.seconds ?? 0
    };
  }

  if (!checkpoint.target) {
    throw new Error(`${routeId} 的 ${checkpoint.type} 检查点缺少 target`);
  }

  const normalizedCell = pointToCell(parseCell(checkpoint.target));
  const targetPoint = cellCenter(normalizedCell);
  return {
    id,
    type: checkpoint.type,
    targetCell: normalizedCell,
    targetPoint: {
      x: targetPoint.x + offset.x,
      y: targetPoint.y + offset.y
    },
    offset
  };
}

function determineVisitMode(
  visitEveryTileCenter = false,
  visitEveryNodeCenter = false,
  visitEveryNodeStably = false,
  hasCheckpoints: boolean
) {
  if (visitEveryTileCenter) {
    return "visitEveryTileCenter" as const;
  }

  if (visitEveryNodeCenter) {
    return "visitEveryNodeCenter" as const;
  }

  if (visitEveryNodeStably || !hasCheckpoints) {
    return "visitEveryNodeStably" as const;
  }

  return "default" as const;
}

function buildNormalizedMap(input: ScenarioInput["map"]): NormalizedMap {
  if (input.width <= 0 || input.height <= 0) {
    throw new Error("地图宽高必须大于 0");
  }

  const tilesByCell: NormalizedMap["tilesByCell"] = {};
  const specialTiles = new Map((input.tiles ?? []).map((tile) => [tile.cell.trim().toUpperCase(), tile]));

  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const cell = pointToCell({ x, y });
      const source = specialTiles.get(cell);
      const terrain = resolveTileTerrain(source);
      const flags = getTerrainFlags(terrain, source?.obstacle_cost);

      tilesByCell[cell] = {
        cell,
        point: { x, y },
        terrain,
        groundPassable: flags.groundPassable,
        flyPassable: flags.flyPassable,
        obstacle: flags.obstacle,
        obstacleCost: flags.obstacleCost
      };
    }
  }

  return {
    width: input.width,
    height: input.height,
    tilesByCell
  };
}

function normalizeRoute(routeInput: ScenarioInput["routes"][number]): NormalizedRoute {
  const checkpoints = (routeInput.checkpoints ?? []).map((checkpoint, checkpointIndex) =>
    normalizeCheckpoint(routeInput.id, checkpoint, checkpointIndex)
  );
  const startCell = pointToCell(parseCell(routeInput.start_point));
  const endCell = pointToCell(parseCell(routeInput.end_point));

  return {
    id: routeInput.id,
    name: routeInput.name || routeInput.id,
    moveMode: routeInput.move_mode,
    allowDiagonalMove: routeInput.allowDiagonalMove ?? true,
    visitEveryCheckPoint: routeInput.visitEveryCheckPoint ?? false,
    ignoreAllButMoveCp: routeInput.ignoreAllButMoveCp ?? false,
    visitMode: determineVisitMode(
      routeInput.visitEveryTileCenter,
      routeInput.visitEveryNodeCenter,
      routeInput.visitEveryNodeStably,
      checkpoints.length > 0
    ),
    startCell,
    startPoint: cellCenter(startCell),
    spawnOffset: normalizeVector(routeInput.spawn_offset),
    endCell,
    endPoint: cellCenter(endCell),
    checkpoints
  };
}

function normalizeEnemyType(input: ScenarioInput["enemy_types"][number]): NormalizedEnemyType {
  return {
    id: input.id,
    name: input.name,
    moveModeOverride: input.move_mode_override ?? null,
    attributeSpeed: input.attribute_speed,
    moveMultiplier: input.moveMultiplier ?? 1,
    steeringFactor: input.steeringFactor ?? null,
    maxSteeringForce: input.maxSteeringForce ?? null,
    halfBodyWidth: input.halfBodyWidth ?? 0.2,
    footOffset: normalizeVector(input.footOffset ?? [0, 0.2]),
    cursorOffset: normalizeVector(input.cursor_offset)
  };
}

function normalizeSpawnEvent(input: ScenarioInput["spawn_events"][number]): NormalizedSpawnEvent {
  return {
    id: input.id,
    timeText: input.time,
    spawnFrame: parseTimeString(input.time),
    enemyTypeId: input.enemy_type_id,
    routeId: input.route_id,
    count: Math.max(1, Math.floor(input.count ?? 1)),
    intervalFrames: Math.max(0, Math.floor(input.interval_frames ?? 0))
  };
}

export function prepareScenario(input: ScenarioInput): ScenarioDraft {
  const map = buildNormalizedMap(input.map);
  const routes = Object.fromEntries(input.routes.map((route) => [route.id, normalizeRoute(route)]));
  const enemyTypes = Object.fromEntries(input.enemy_types.map((enemyType) => [enemyType.id, normalizeEnemyType(enemyType)]));
  const spawnEvents = input.spawn_events.map(normalizeSpawnEvent);

  Object.values(routes).forEach((route) => {
    if (!map.tilesByCell[route.startCell]) {
      throw new Error(`路线 ${route.id} 的起点 ${route.startCell} 超出地图范围`);
    }

    if (!map.tilesByCell[route.endCell]) {
      throw new Error(`路线 ${route.id} 的终点 ${route.endCell} 超出地图范围`);
    }

    route.checkpoints.forEach((checkpoint) => {
      if (checkpoint.targetCell && !map.tilesByCell[checkpoint.targetCell]) {
        throw new Error(`路线 ${route.id} 的检查点 ${checkpoint.targetCell} 超出地图范围`);
      }
    });
  });

  spawnEvents.forEach((event) => {
    if (!enemyTypes[event.enemyTypeId]) {
      throw new Error(`刷怪事件 ${event.id} 引用了不存在的敌人模板 ${event.enemyTypeId}`);
    }

    if (!routes[event.routeId]) {
      throw new Error(`刷怪事件 ${event.id} 引用了不存在的路线 ${event.routeId}`);
    }
  });

  return {
    map,
    routes,
    enemyTypes,
    spawnEvents,
    pathMaps: {}
  };
}
