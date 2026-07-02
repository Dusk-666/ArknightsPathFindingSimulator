import type { GridPoint, MoveMode, NormalizedMap } from "../models";
import { pointToCell } from "../utils/cells";

export function isInBounds(map: NormalizedMap, point: GridPoint): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height;
}

export function getTile(map: NormalizedMap, point: GridPoint) {
  return map.tilesByCell[pointToCell(point)];
}

export function isCellTraversable(map: NormalizedMap, point: GridPoint, moveMode: MoveMode): boolean {
  if (!isInBounds(map, point)) {
    return false;
  }

  const tile = getTile(map, point);
  if (!tile) {
    return false;
  }

  return moveMode === "ground" ? tile.groundPassable : tile.flyPassable;
}

export function movementCost(map: NormalizedMap, point: GridPoint, moveMode: MoveMode): number {
  const tile = getTile(map, point);
  if (!tile) {
    return Number.POSITIVE_INFINITY;
  }

  if (moveMode === "fly") {
    return 1;
  }

  if (tile.obstacle) {
    return tile.obstacleCost || 1000;
  }

  return 1;
}
