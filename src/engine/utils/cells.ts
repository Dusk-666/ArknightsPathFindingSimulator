import type { GridPoint, Vec2 } from "../models";
import { bankersRound, roundTo } from "./rounding";

export function columnIndexToLabel(index: number): string {
  let current = index + 1;
  let label = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }

  return label;
}

export function columnLabelToIndex(label: string): number {
  return label
    .toUpperCase()
    .split("")
    .reduce((value, character) => value * 26 + (character.charCodeAt(0) - 64), 0) - 1;
}

export function pointToCell(point: GridPoint): string {
  return `${columnIndexToLabel(point.x)}${point.y + 1}`;
}

export function parseCell(cell: string): GridPoint {
  const match = cell.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`\u683c\u5b50\u540d\u65e0\u6548: ${cell}`);
  }

  return {
    x: columnLabelToIndex(match[1]),
    y: Number(match[2]) - 1
  };
}

export function clampGridPoint(point: GridPoint, width: number, height: number): GridPoint {
  return {
    x: Math.max(0, Math.min(width - 1, point.x)),
    y: Math.max(0, Math.min(height - 1, point.y))
  };
}

export function clampCell(cell: string, width: number, height: number): string {
  return pointToCell(clampGridPoint(parseCell(cell), width, height));
}

export function gridPointToVec(point: GridPoint): Vec2 {
  return { x: point.x, y: point.y };
}

export function cellCenter(cell: string | GridPoint): Vec2 {
  if (typeof cell === "string") {
    return gridPointToVec(parseCell(cell));
  }

  return gridPointToVec(cell);
}

export function sameGridPoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

export function worldToOwnedGrid(position: Vec2): GridPoint {
  return {
    x: bankersRound(position.x),
    y: bankersRound(position.y)
  };
}

export function formatRelativePosition(position: Vec2): string {
  const owned = worldToOwnedGrid(position);
  const center = gridPointToVec(owned);
  const offsetX = roundTo(position.x - center.x);
  const offsetY = roundTo(position.y - center.y);
  return `\u4f4d\u4e8e ${pointToCell(owned)} \u683c\uff0cx${formatSigned(offsetX)}\uff0cy${formatSigned(offsetY)}`;
}

function formatSigned(value: number): string {
  const rounded = roundTo(value);
  const prefix = rounded >= 0 ? "+" : "-";
  return `${prefix}${Math.abs(rounded).toFixed(4)}`;
}
