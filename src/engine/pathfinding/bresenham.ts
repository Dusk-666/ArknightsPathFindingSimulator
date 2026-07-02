import type { GridPoint, MoveMode, NormalizedMap } from "../models";
import { pointToCell } from "../utils/cells";
import { getTile, isInBounds } from "./mapAccess";

function collectModifiedBresenhamCells(start: GridPoint, end: GridPoint): GridPoint[] {
  const visited = new Map<string, GridPoint>();
  const add = (point: GridPoint) => {
    visited.set(pointToCell(point), point);
  };

  add(start);

  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = Math.sign(end.x - start.x);
  const sy = Math.sign(end.y - start.y);
  let err = dx - dy;
  const xIsLongAxis = dx >= dy;

  while (x !== end.x || y !== end.y) {
    const prevX = x;
    const prevY = y;
    const doubledError = err * 2;
    let movedX = false;
    let movedY = false;

    if (doubledError > -dy) {
      err -= dy;
      x += sx;
      movedX = sx !== 0;
    }

    if (doubledError < dx) {
      err += dx;
      y += sy;
      movedY = sy !== 0;
    }

    add({ x, y });

    if (movedX && movedY) {
      add({ x: prevX + sx, y: prevY });
      add({ x: prevX, y: prevY + sy });
    }

    if (xIsLongAxis && movedY) {
      add({ x: prevX, y });
      add({ x: x - sx, y });
    }

    if (!xIsLongAxis && movedX) {
      add({ x, y: prevY });
      add({ x, y: y - sy });
    }
  }

  if (dx === 1 || dy === 1) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    for (let scanY = minY; scanY <= maxY; scanY += 1) {
      for (let scanX = minX; scanX <= maxX; scanX += 1) {
        add({ x: scanX, y: scanY });
      }
    }
  }

  return [...visited.values()];
}

function isFlatteningPassable(map: NormalizedMap, point: GridPoint, moveMode: MoveMode): boolean {
  if (!isInBounds(map, point)) {
    return false;
  }

  const tile = getTile(map, point);
  if (!tile) {
    return false;
  }

  if (moveMode === "ground") {
    return tile.groundPassable && !tile.obstacle;
  }

  return tile.flyPassable;
}

export function canStraightConnect(
  map: NormalizedMap,
  moveMode: MoveMode,
  start: GridPoint,
  end: GridPoint
): boolean {
  const cells = collectModifiedBresenhamCells(start, end);

  return cells.every((point) => {
    if (pointToCell(point) === pointToCell(start) || pointToCell(point) === pointToCell(end)) {
      return true;
    }

    return isFlatteningPassable(map, point, moveMode);
  });
}
