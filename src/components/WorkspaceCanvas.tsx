import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { DebugToggles, QueryResultItem, ScenarioInput, SimulationResult, Vec2 } from "../engine/models";
import { cellCenter, pointToCell } from "../engine/utils/cells";
import { getTerrainAtCell, getTerrainLabel } from "../editor/models/mapEditorModel";
import type { RoutePlacementMode } from "../editor/models/routeEditorModel";
import { HoverTooltip } from "./HoverTooltip";

type CanvasInteractionMode = "paint" | "route" | "view";
type CanvasFitMode = "contain" | "natural";

interface WorkspaceCanvasProps {
  title?: string | null;
  badge: string;
  scenario: ScenarioInput;
  simulation: SimulationResult;
  currentFrame: number;
  activeItems: QueryResultItem[];
  selectedCell: string | null;
  selectedRouteId: string | null;
  routeColors: Record<string, string>;
  routePlacementMode: RoutePlacementMode;
  debugPathMapId: string | null;
  toggles: DebugToggles;
  interactionMode: CanvasInteractionMode;
  fitMode?: CanvasFitMode;
  onSelectCell: (cell: string) => void;
  onPaintCell: (cell: string) => void;
  onRoutePickCell: (cell: string) => void;
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

const CELL_SIZE = 60;
const MARGIN_X = 66;
const MARGIN_Y = 56;

function toCanvas(point: Vec2) {
  return {
    x: MARGIN_X + point.x * CELL_SIZE,
    y: MARGIN_Y + point.y * CELL_SIZE
  };
}

function drawArrow(ctx: CanvasRenderingContext2D, from: Vec2, to: Vec2, color: string, width = 2) {
  const start = toCanvas(from);
  const end = toCanvas(to);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = 6;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function resolveTileColors(terrain: string) {
  switch (terrain) {
    case "GROUND_BLOCK":
      return { fill: "#251b24", border: "rgba(248, 113, 113, 0.36)" };
    case "FLY_BLOCK":
      return { fill: "#1b1d31", border: "rgba(167, 139, 250, 0.38)" };
    case "OBSTACLE":
      return { fill: "#342617", border: "rgba(245, 158, 11, 0.44)" };
    case "HIGH_COST_OBSTACLE":
      return { fill: "#3b1f22", border: "rgba(251, 113, 133, 0.44)" };
    case "NORMAL":
    default:
      return { fill: "#13222a", border: "rgba(118, 152, 173, 0.22)" };
  }
}

function safeCellCenter(cell: string | undefined): Vec2 | null {
  if (!cell) {
    return null;
  }

  try {
    return cellCenter(cell);
  } catch {
    return null;
  }
}

function localToCell(localX: number, localY: number, scenario: ScenarioInput): string | null {
  const gridX = Math.floor((localX - (MARGIN_X - CELL_SIZE / 2)) / CELL_SIZE);
  const gridY = Math.floor((localY - (MARGIN_Y - CELL_SIZE / 2)) / CELL_SIZE);

  if (gridX < 0 || gridY < 0 || gridX >= scenario.map.width || gridY >= scenario.map.height) {
    return null;
  }

  return pointToCell({ x: gridX, y: gridY });
}

export function WorkspaceCanvas({
  title,
  badge,
  scenario,
  simulation,
  currentFrame,
  activeItems,
  selectedCell,
  selectedRouteId,
  routeColors,
  routePlacementMode,
  debugPathMapId,
  toggles,
  interactionMode,
  fitMode = "natural",
  onSelectCell,
  onPaintCell,
  onRoutePickCell
}: WorkspaceCanvasProps) {
  const canvasWidth = MARGIN_X * 2 + (scenario.map.width - 1) * CELL_SIZE;
  const canvasHeight = MARGIN_Y * 2 + (scenario.map.height - 1) * CELL_SIZE;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isPaintingRef = useRef(false);
  const lastPaintedCellRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [displaySize, setDisplaySize] = useState(() => ({
    width: canvasWidth,
    height: canvasHeight
  }));

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) {
      return;
    }

    const updateDisplaySize = () => {
      if (fitMode !== "contain") {
        setDisplaySize((previous) =>
          previous.width === canvasWidth && previous.height === canvasHeight
            ? previous
            : { width: canvasWidth, height: canvasHeight }
        );
        return;
      }

      const availableWidth = Math.max(120, container.clientWidth - 48);
      const availableHeight = Math.max(120, container.clientHeight - 56);
      const scale = Math.max(0.1, Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight) * 0.97);
      const nextWidth = Math.round(canvasWidth * scale);
      const nextHeight = Math.round(canvasHeight * scale);

      setDisplaySize((previous) =>
        previous.width === nextWidth && previous.height === nextHeight
          ? previous
          : { width: nextWidth, height: nextHeight }
      );
    };

    updateDisplaySize();

    const observer = new ResizeObserver(() => updateDisplaySize());
    observer.observe(container);

    return () => observer.disconnect();
  }, [canvasHeight, canvasWidth, fitMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${displaySize.width}px`;
    canvas.style.height = `${displaySize.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, "#0f1922");
    gradient.addColorStop(1, "#061017");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let y = 0; y < scenario.map.height; y += 1) {
      for (let x = 0; x < scenario.map.width; x += 1) {
        const cell = pointToCell({ x, y });
        const terrain = getTerrainAtCell(scenario.map, cell);
        const colors = resolveTileColors(terrain);
        const center = toCanvas({ x, y });
        const left = center.x - CELL_SIZE / 2;
        const top = center.y - CELL_SIZE / 2;

        ctx.fillStyle = colors.fill;
        ctx.fillRect(left, top, CELL_SIZE, CELL_SIZE);

        if (terrain === "OBSTACLE" || terrain === "HIGH_COST_OBSTACLE") {
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(left + 9, top + 9);
          ctx.lineTo(left + CELL_SIZE - 9, top + CELL_SIZE - 9);
          ctx.moveTo(left + CELL_SIZE - 9, top + 9);
          ctx.lineTo(left + 9, top + CELL_SIZE - 9);
          ctx.stroke();
        }

        ctx.strokeStyle = colors.border;
        ctx.lineWidth = selectedCell === cell ? 2 : 1;
        ctx.strokeRect(left, top, CELL_SIZE, CELL_SIZE);

        ctx.fillStyle = selectedCell === cell ? "#f8fafc" : "rgba(216, 226, 235, 0.55)";
        ctx.font = "11px Consolas, monospace";
        ctx.fillText(cell, left + 6, top + 16);

        if (selectedCell === cell) {
          ctx.strokeStyle = "#f8d26b";
          ctx.lineWidth = 2;
          ctx.strokeRect(left + 2, top + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      }
    }

    for (let x = 0; x < scenario.map.width; x += 1) {
      ctx.fillStyle = "#d9e4ea";
      ctx.font = "600 13px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText(String.fromCharCode(65 + x), MARGIN_X + x * CELL_SIZE - 4, 22);
    }

    for (let y = 0; y < scenario.map.height; y += 1) {
      ctx.fillStyle = "#d9e4ea";
      ctx.font = "600 13px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText(String(y + 1), 24, MARGIN_Y + y * CELL_SIZE + 4);
    }

    scenario.routes.forEach((route) => {
      const color = routeColors[route.id] ?? "#5dd7ff";
      const alpha = route.id === selectedRouteId ? 0.92 : 0.26;
      const points = [
        safeCellCenter(route.start_point),
        ...(route.checkpoints ?? []).map((checkpoint) => safeCellCenter(checkpoint.target)),
        safeCellCenter(route.end_point)
      ].filter((point): point is Vec2 => point !== null);

      if (points.length < 2) {
        return;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = route.id === selectedRouteId ? 3 : 2;
      ctx.setLineDash(route.id === selectedRouteId ? [] : [7, 5]);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      points.forEach((point, index) => {
        const canvasPoint = toCanvas(point);
        if (index === 0) {
          ctx.moveTo(canvasPoint.x, canvasPoint.y);
        } else {
          ctx.lineTo(canvasPoint.x, canvasPoint.y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      const drawMarker = (point: Vec2, label: string, fill: string) => {
        const canvasPoint = toCanvas(point);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(canvasPoint.x, canvasPoint.y, route.id === selectedRouteId ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f8fafc";
        ctx.font = "11px Consolas, monospace";
        ctx.fillText(label, canvasPoint.x + 10, canvasPoint.y - 8);
      };

      const startPoint = safeCellCenter(route.start_point);
      const endPoint = safeCellCenter(route.end_point);

      if (startPoint) {
        drawMarker(startPoint, "START", "#34d399");
      }
      (route.checkpoints ?? []).forEach((checkpoint, index) => {
        const checkpointPoint = safeCellCenter(checkpoint.target);
        if (checkpointPoint) {
          drawMarker(checkpointPoint, `CP${index + 1}`, color);
        }
      });
      if (endPoint) {
        drawMarker(endPoint, "END", "#f87171");
      }
      ctx.globalAlpha = 1;
    });

    if (debugPathMapId) {
      const debugPathMap = simulation.scenario.pathMaps[debugPathMapId];
      if (debugPathMap) {
        Object.values(debugPathMap.nodes).forEach((node) => {
          if (toggles.showNextNode && pointToCell(node.nextNode) !== pointToCell(node.cell)) {
            drawArrow(ctx, cellCenter(node.cell), cellCenter(node.nextNode), "rgba(248, 196, 64, 0.74)", 1.4);
          }

          const anchor = toCanvas(node.cell);
          if (toggles.showDistanceToTarget && Number.isFinite(node.distanceToTarget)) {
            ctx.fillStyle = "rgba(255,255,255,0.86)";
            ctx.font = "10px Consolas, monospace";
            ctx.fillText(node.distanceToTarget.toFixed(1), anchor.x - 18, anchor.y + 18);
          }

          if (toggles.showDistanceToEnd && Number.isFinite(node.distanceToEnd)) {
            ctx.fillStyle = "rgba(110, 230, 200, 0.88)";
            ctx.font = "10px Consolas, monospace";
            ctx.fillText(node.distanceToEnd.toFixed(1), anchor.x - 18, anchor.y + 30);
          }
        });
      }
    }

    activeItems.forEach((item, index) => {
      const simulated = simulation.enemies[item.enemyId];
      const cutoff = Math.min(currentFrame - simulated.enemy.spawnFrame + 1, simulated.trajectory.length);
      const trail = simulated.trajectory.slice(0, Math.max(cutoff, 0));

      if (trail.length > 1) {
        ctx.strokeStyle = index % 2 === 0 ? "rgba(255, 176, 65, 0.85)" : "rgba(92, 214, 255, 0.8)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        trail.forEach((point, trailIndex) => {
          const canvasPoint = toCanvas(point);
          if (trailIndex === 0) {
            ctx.moveTo(canvasPoint.x, canvasPoint.y);
          } else {
            ctx.lineTo(canvasPoint.x, canvasPoint.y);
          }
        });
        ctx.stroke();
      }

      const enemyPoint = toCanvas(item.snapshot.entityPos);
      ctx.fillStyle = index % 2 === 0 ? "#ffb649" : "#5cd6ff";
      ctx.strokeStyle = "#081017";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enemyPoint.x, enemyPoint.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 11px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText(item.name, enemyPoint.x - 18, enemyPoint.y - 14);

      if (toggles.showCursorPos) {
        const cursorPoint = toCanvas(item.snapshot.cursorPos);
        ctx.strokeStyle = "#93f4ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cursorPoint.x - 6, cursorPoint.y);
        ctx.lineTo(cursorPoint.x + 6, cursorPoint.y);
        ctx.moveTo(cursorPoint.x, cursorPoint.y - 6);
        ctx.lineTo(cursorPoint.x, cursorPoint.y + 6);
        ctx.stroke();
      }

      if (toggles.showFootPos) {
        const footPoint = toCanvas(item.snapshot.footPos);
        ctx.fillStyle = "#4df0a1";
        ctx.beginPath();
        ctx.arc(footPoint.x, footPoint.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (toggles.showAvoidanceForce) {
        drawArrow(
          ctx,
          item.snapshot.entityPos,
          {
            x: item.snapshot.entityPos.x + item.snapshot.avoidanceForce.x * 0.55,
            y: item.snapshot.entityPos.y + item.snapshot.avoidanceForce.y * 0.55
          },
          "#ff7f50"
        );
      }

      if (toggles.showInertiaVelocity) {
        drawArrow(
          ctx,
          item.snapshot.entityPos,
          {
            x: item.snapshot.entityPos.x + item.snapshot.inertiaVelocity.x * 0.25,
            y: item.snapshot.entityPos.y + item.snapshot.inertiaVelocity.y * 0.25
          },
          "#70e1ff"
        );
      }
    });
  }, [
    activeItems,
    canvasHeight,
    canvasWidth,
    currentFrame,
    displaySize.height,
    displaySize.width,
    debugPathMapId,
    routeColors,
    scenario,
    selectedCell,
    selectedRouteId,
    simulation,
    toggles
  ]);

  const updateTooltip = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const localDisplayX = event.clientX - rect.left;
    const localDisplayY = event.clientY - rect.top;
    const scaleX = rect.width <= 0 ? 1 : canvasWidth / rect.width;
    const scaleY = rect.height <= 0 ? 1 : canvasHeight / rect.height;
    const localX = localDisplayX * scaleX;
    const localY = localDisplayY * scaleY;

    const hoveredEnemy = activeItems.find((item) => {
      const point = toCanvas(item.snapshot.entityPos);
      return Math.hypot(point.x - localX, point.y - localY) <= 14;
    });

    if (hoveredEnemy) {
      setTooltip({
        x: localDisplayX + 18,
        y: localDisplayY + 18,
        text: `${hoveredEnemy.name}\n${hoveredEnemy.description}`
      });
      return;
    }

    const hoveredCell = localToCell(localX, localY, scenario);
    if (!hoveredCell) {
      setTooltip(null);
      return;
    }

    setTooltip({
      x: localDisplayX + 18,
      y: localDisplayY + 18,
      text: `${hoveredCell}\n${getTerrainLabel(getTerrainAtCell(scenario.map, hoveredCell))}`
    });
  };

  const stopPainting = () => {
    isPaintingRef.current = false;
    lastPaintedCellRef.current = null;
  };

  const handleMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const localX = (event.clientX - rect.left) * (rect.width <= 0 ? 1 : canvasWidth / rect.width);
    const localY = (event.clientY - rect.top) * (rect.height <= 0 ? 1 : canvasHeight / rect.height);
    const cell = localToCell(localX, localY, scenario);
    if (!cell) {
      return;
    }

    onSelectCell(cell);

    if (routePlacementMode !== "idle") {
      onRoutePickCell(cell);
      return;
    }

    if (interactionMode !== "paint") {
      return;
    }

    isPaintingRef.current = true;
    lastPaintedCellRef.current = cell;
    onPaintCell(cell);
  };

  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    updateTooltip(event);

    if (interactionMode !== "paint" || !isPaintingRef.current || routePlacementMode !== "idle") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const localX = (event.clientX - rect.left) * (rect.width <= 0 ? 1 : canvasWidth / rect.width);
    const localY = (event.clientY - rect.top) * (rect.height <= 0 ? 1 : canvasHeight / rect.height);
    const cell = localToCell(localX, localY, scenario);
    if (!cell || cell === lastPaintedCellRef.current) {
      return;
    }

    lastPaintedCellRef.current = cell;
    onSelectCell(cell);
    onPaintCell(cell);
  };

  return (
    <section className="panel panel--viewport">
      <div className="panel__header">
        <div>
          <span className="panel__eyebrow">Viewport</span>
          {title ? <h2>{title}</h2> : null}
        </div>
        <span className="panel__badge">{badge}</span>
      </div>

      <div ref={viewportRef} className={`map-wrap ${fitMode === "contain" ? "map-wrap--fit" : "map-wrap--natural"}`}>
        <div className="map-wrap__inner" style={{ width: displaySize.width, height: displaySize.height }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopPainting}
            onMouseLeave={() => {
              stopPainting();
              setTooltip(null);
            }}
          />
          {tooltip ? <HoverTooltip {...tooltip} /> : null}
        </div>
      </div>
    </section>
  );
}
