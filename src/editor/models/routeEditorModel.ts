import type { CheckpointInput, CheckpointType, MapInput, RouteInput } from "../../engine/models";
import { clampCell } from "../../engine/utils/cells";
import { createSequentialId } from "./ids";

export type RoutePlacementMode = "idle" | "setStart" | "setEnd" | "addMoveCheckpoint" | "addPatrolCheckpoint";

export const ROUTE_COLORS = [
  "#5dd7ff",
  "#ffb84d",
  "#5ce1a8",
  "#ff7b84",
  "#9d8cff",
  "#facc15"
];

export function getRouteColor(index: number): string {
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
}

export function createRoute(existingRoutes: RouteInput[], map: MapInput): RouteInput {
  const id = createSequentialId(existingRoutes.map((route) => route.id), "route");
  const fallbackStart = clampCell("A1", map.width, map.height);
  const fallbackEnd = clampCell("B1", map.width, map.height);

  return {
    id,
    name: `\u65b0\u8def\u7ebf ${existingRoutes.length + 1}`,
    move_mode: "ground",
    allowDiagonalMove: true,
    visitEveryTileCenter: false,
    visitEveryNodeCenter: false,
    visitEveryNodeStably: false,
    visitEveryCheckPoint: false,
    ignoreAllButMoveCp: false,
    start_point: fallbackStart,
    spawn_offset: [0, 0],
    end_point: fallbackEnd,
    checkpoints: []
  };
}

export function setRouteEndpoint(route: RouteInput, key: "start_point" | "end_point", cell: string): RouteInput {
  return {
    ...route,
    [key]: cell
  };
}

function createCheckpointId(route: RouteInput, type: CheckpointType, length: number) {
  const prefix = type === "WAIT_FOR_SECONDS" ? "wait" : "move";
  return `${route.id}_${prefix}_${length + 1}`;
}

export function addCheckpoint(route: RouteInput, type: CheckpointType, target?: string): RouteInput {
  const checkpoints = [...(route.checkpoints ?? [])];
  checkpoints.push(
    type === "WAIT_FOR_SECONDS"
      ? {
          id: createCheckpointId(route, type, checkpoints.length),
          type,
          seconds: 1
        }
      : {
          id: createCheckpointId(route, type, checkpoints.length),
          type,
          target,
          offset: [0, 0]
        }
  );

  return {
    ...route,
    checkpoints
  };
}

export function updateCheckpoint(route: RouteInput, checkpointIndex: number, patch: Partial<CheckpointInput>): RouteInput {
  return {
    ...route,
    checkpoints: (route.checkpoints ?? []).map((checkpoint, index) =>
      index === checkpointIndex ? { ...checkpoint, ...patch } : checkpoint
    )
  };
}

export function removeCheckpoint(route: RouteInput, checkpointIndex: number): RouteInput {
  return {
    ...route,
    checkpoints: (route.checkpoints ?? []).filter((_, index) => index !== checkpointIndex)
  };
}

export function moveCheckpoint(route: RouteInput, checkpointIndex: number, direction: -1 | 1): RouteInput {
  const checkpoints = [...(route.checkpoints ?? [])];
  const targetIndex = checkpointIndex + direction;
  if (targetIndex < 0 || targetIndex >= checkpoints.length) {
    return route;
  }

  const [item] = checkpoints.splice(checkpointIndex, 1);
  checkpoints.splice(targetIndex, 0, item);

  return {
    ...route,
    checkpoints
  };
}

export function clampRouteToMap(route: RouteInput, map: MapInput): RouteInput {
  return {
    ...route,
    start_point: clampCell(route.start_point, map.width, map.height),
    end_point: clampCell(route.end_point, map.width, map.height),
    checkpoints: (route.checkpoints ?? []).map((checkpoint) =>
      checkpoint.target
        ? {
            ...checkpoint,
            target: clampCell(checkpoint.target, map.width, map.height)
          }
        : checkpoint
    )
  };
}
