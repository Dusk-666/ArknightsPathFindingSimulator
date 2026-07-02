import type { SpawnEventInput } from "../../engine/models";
import { formatFrameCount, parseTimeString } from "../../engine/utils/time";
import { createSequentialId } from "./ids";

export function createSpawnEvent(
  existingEvents: SpawnEventInput[],
  frame: number,
  enemyTypeId: string,
  routeId: string
): SpawnEventInput {
  return {
    id: createSequentialId(existingEvents.map((event) => event.id), "spawn"),
    time: formatFrameCount(frame),
    enemy_type_id: enemyTypeId,
    route_id: routeId,
    count: 1,
    interval_frames: 0
  };
}

export function sortSpawnEvents(events: SpawnEventInput[]): SpawnEventInput[] {
  return events
    .slice()
    .sort((left, right) => parseTimeString(left.time) - parseTimeString(right.time) || left.id.localeCompare(right.id));
}

export function expandSpawnFrames(input: Pick<SpawnEventInput, "time" | "count" | "interval_frames">): number[] {
  const start = parseTimeString(input.time);
  const count = Math.max(1, input.count ?? 1);
  const interval = Math.max(0, input.interval_frames ?? 0);
  return Array.from({ length: count }, (_, index) => start + index * interval);
}
