import type { MapInput, TerrainType, TileInput } from "../../engine/models";
import { clampCell, parseCell, pointToCell } from "../../engine/utils/cells";

export type TileBrushId = TerrainType;

export interface TileBrushOption {
  id: TileBrushId;
  label: string;
  description: string;
  accent: string;
}

export const TILE_BRUSHES: TileBrushOption[] = [
  {
    id: "NORMAL",
    label: "\u666e\u901a\u5730\u5757",
    description: "\u5730\u9762\u4e0e\u98de\u884c\u90fd\u53ef\u901a\u884c\u3002",
    accent: "#5db8ff"
  },
  {
    id: "GROUND_BLOCK",
    label: "\u5730\u9762\u4e0d\u53ef\u901a\u884c",
    description: "\u5730\u9762\u5355\u4f4d\u65e0\u6cd5\u901a\u8fc7\uff0c\u98de\u884c\u5355\u4f4d\u53ef\u901a\u8fc7\u3002",
    accent: "#f87171"
  },
  {
    id: "FLY_BLOCK",
    label: "\u98de\u884c\u4e0d\u53ef\u901a\u884c",
    description: "\u98de\u884c\u5355\u4f4d\u65e0\u6cd5\u901a\u8fc7\uff0c\u5730\u9762\u5355\u4f4d\u53ef\u901a\u8fc7\u3002",
    accent: "#a78bfa"
  },
  {
    id: "OBSTACLE",
    label: "\u969c\u788d\u7269",
    description: "\u5bfb\u8def\u9ad8\u4ee3\u4ef7\uff0c\u5b9e\u4f53\u79fb\u52a8\u4f1a\u907f\u969c\u3002",
    accent: "#f59e0b"
  },
  {
    id: "HIGH_COST_OBSTACLE",
    label: "\u9ad8\u4ee3\u4ef7\u969c\u788d",
    description: "\u548c\u969c\u788d\u7269\u76f8\u540c\uff0c\u4f46\u4ee3\u4ef7\u66f4\u9ad8\uff0c\u53ef\u8c03 obstacle_cost\u3002",
    accent: "#fb7185"
  }
];

export function getTerrainLabel(terrain: TerrainType): string {
  return TILE_BRUSHES.find((brush) => brush.id === terrain)?.label ?? terrain;
}

export function createEmptyMap(width: number, height: number): MapInput {
  const safeWidth = Number.isFinite(width) ? Math.floor(width) : 1;
  const safeHeight = Number.isFinite(height) ? Math.floor(height) : 1;

  return {
    width: Math.max(1, safeWidth),
    height: Math.max(1, safeHeight),
    tiles: []
  };
}

export function getTileOverride(map: MapInput, cell: string): TileInput | undefined {
  return map.tiles?.find((tile) => tile.cell.toUpperCase() === cell.toUpperCase());
}

export function getTerrainAtCell(map: MapInput, cell: string): TerrainType {
  return getTileOverride(map, cell)?.terrain ?? "NORMAL";
}

function createTileInput(cell: string, terrain: TerrainType, obstacleCost?: number): TileInput {
  const normalizedCell = pointToCell(parseCell(cell));
  if (terrain === "NORMAL") {
    return {
      cell: normalizedCell,
      terrain
    };
  }

  return {
    cell: normalizedCell,
    terrain,
    obstacle_cost:
      terrain === "OBSTACLE"
        ? obstacleCost ?? 1000
        : terrain === "HIGH_COST_OBSTACLE"
          ? obstacleCost ?? 1600
          : undefined
  };
}

export function applyBrushToMap(map: MapInput, cell: string, brush: TileBrushId): MapInput {
  const normalizedCell = pointToCell(parseCell(cell));
  const nextTiles = (map.tiles ?? []).filter((tile) => tile.cell.toUpperCase() !== normalizedCell);

  if (brush !== "NORMAL") {
    const previous = getTileOverride(map, normalizedCell);
    nextTiles.push(createTileInput(normalizedCell, brush, previous?.obstacle_cost));
  }

  nextTiles.sort((left, right) => left.cell.localeCompare(right.cell));

  return {
    ...map,
    tiles: nextTiles
  };
}

export function updateTileObstacleCost(map: MapInput, cell: string, obstacleCost: number): MapInput {
  const normalizedCell = pointToCell(parseCell(cell));
  const previous = getTileOverride(map, normalizedCell);
  const terrain = previous?.terrain ?? "HIGH_COST_OBSTACLE";

  const nextTiles = (map.tiles ?? []).filter((tile) => tile.cell.toUpperCase() !== normalizedCell);
  nextTiles.push(createTileInput(normalizedCell, terrain, obstacleCost));
  nextTiles.sort((left, right) => left.cell.localeCompare(right.cell));

  return {
    ...map,
    tiles: nextTiles
  };
}

export function rebuildEmptyMap(map: MapInput, width: number, height: number): MapInput {
  const safeWidth = Number.isFinite(width) ? Math.floor(width) : 1;
  const safeHeight = Number.isFinite(height) ? Math.floor(height) : 1;

  return {
    ...map,
    width: Math.max(1, safeWidth),
    height: Math.max(1, safeHeight),
    tiles: []
  };
}

export function clampCellToMap(cell: string, map: MapInput): string {
  return clampCell(cell, map.width, map.height);
}
