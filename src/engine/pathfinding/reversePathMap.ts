import type { GridPoint, MoveMode, NormalizedMap, PathMap, PathNodeRecord } from "../models";
import { parseCell, pointToCell, sameGridPoint } from "../utils/cells";
import { canStraightConnect } from "./bresenham";
import { getTile, isCellTraversable, isInBounds, movementCost } from "./mapAccess";

const REVERSE_SCAN_ORDER: Array<{ x: number; y: number }> = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

function createInitialNodes(map: NormalizedMap): Record<string, PathNodeRecord> {
  const nodes: Record<string, PathNodeRecord> = {};

  Object.values(map.tilesByCell).forEach((tile) => {
    nodes[tile.cell] = {
      cell: tile.point,
      distanceToTarget: Number.POSITIVE_INFINITY,
      nextNode: tile.point,
      distanceToEnd: Number.POSITIVE_INFINITY
    };
  });

  return nodes;
}

export function clonePathMap(pathMap: PathMap, id: string): PathMap {
  const nodes = Object.fromEntries(
    Object.entries(pathMap.nodes).map(([cell, node]) => [
      cell,
      {
        cell: { ...node.cell },
        distanceToTarget: node.distanceToTarget,
        nextNode: { ...node.nextNode },
        distanceToEnd: node.distanceToEnd
      }
    ])
  );

  return {
    id,
    cacheKey: pathMap.cacheKey,
    moveMode: pathMap.moveMode,
    targetCell: pathMap.targetCell,
    targetPoint: { ...pathMap.targetPoint },
    nodes
  };
}

export function buildReversePathMap(
  map: NormalizedMap,
  moveMode: MoveMode,
  targetCell: string,
  id: string
): PathMap {
  const targetPoint = parseCell(targetCell);
  const nodes = createInitialNodes(map);
  const queue: GridPoint[] = [];
  const queued = new Set<string>();
  const normalizedTargetCell = pointToCell(targetPoint);

  const targetNode = nodes[normalizedTargetCell];
  targetNode.distanceToTarget = 0;
  targetNode.nextNode = targetPoint;
  queue.push(targetPoint);
  queued.add(normalizedTargetCell);

  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    queued.delete(pointToCell(current));
    const currentNode = nodes[pointToCell(current)];

    REVERSE_SCAN_ORDER.forEach((direction) => {
      const neighbor = {
        x: current.x + direction.x,
        y: current.y + direction.y
      };

      if (!isInBounds(map, neighbor)) {
        return;
      }

      if (!isCellTraversable(map, neighbor, moveMode) || !isCellTraversable(map, current, moveMode)) {
        return;
      }

      const candidateDistance = currentNode.distanceToTarget + movementCost(map, neighbor, moveMode);
      const neighborCell = pointToCell(neighbor);
      const neighborNode = nodes[neighborCell];

      if (
        !Number.isFinite(neighborNode.distanceToTarget) ||
        candidateDistance < neighborNode.distanceToTarget
      ) {
        neighborNode.distanceToTarget = candidateDistance;
        neighborNode.nextNode = current;

        if (!queued.has(neighborCell)) {
          queue.push(neighbor);
          queued.add(neighborCell);
        }
      }
    });
  }

  return {
    id,
    cacheKey: `${moveMode}:${normalizedTargetCell}`,
    moveMode,
    targetCell: normalizedTargetCell,
    targetPoint,
    nodes
  };
}

export function flattenPathMap(pathMap: PathMap, map: NormalizedMap): PathMap {
  Object.values(pathMap.nodes).forEach((node) => {
    if (!Number.isFinite(node.distanceToTarget)) {
      return;
    }

    if (!isCellTraversable(map, node.cell, pathMap.moveMode)) {
      return;
    }

    let cursor = node.nextNode;
    let bestCandidate = node.nextNode;
    let guard = 0;

    while (guard < map.width * map.height) {
      const cursorNode = pathMap.nodes[pointToCell(cursor)];
      if (!cursorNode || sameGridPoint(cursor, cursorNode.nextNode)) {
        break;
      }

      if (canStraightConnect(map, pathMap.moveMode, node.cell, cursor)) {
        bestCandidate = cursor;
      }

      cursor = cursorNode.nextNode;
      guard += 1;
    }

    if (canStraightConnect(map, pathMap.moveMode, node.cell, cursor)) {
      bestCandidate = cursor;
    }

    node.nextNode = bestCandidate;
  });

  return pathMap;
}
