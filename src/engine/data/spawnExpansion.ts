import type {
  MoveMode,
  NormalizedEnemy,
  NormalizedEnemyType,
  NormalizedRoute,
  NormalizedSpawnEvent
} from "../models";
import { formatFrameCount } from "../utils/time";

function resolveSteering(mode: MoveMode, value: number | null, groundDefault: number, flyDefault: number) {
  if (value !== null) {
    return value;
  }

  return mode === "fly" ? flyDefault : groundDefault;
}

export function expandSpawnEventFrames(event: Pick<NormalizedSpawnEvent, "spawnFrame" | "count" | "intervalFrames">): number[] {
  return Array.from({ length: Math.max(1, event.count) }, (_, index) => event.spawnFrame + index * event.intervalFrames);
}

interface SpawnExpansionEntry {
  event: NormalizedSpawnEvent;
  enemyType: NormalizedEnemyType;
  route: NormalizedRoute;
  copyIndex: number;
  spawnFrame: number;
}

export function expandSpawnEvents(
  enemyTypes: Record<string, NormalizedEnemyType>,
  routes: Record<string, NormalizedRoute>,
  spawnEvents: NormalizedSpawnEvent[]
): NormalizedEnemy[] {
  const expandedEntries: SpawnExpansionEntry[] = [];

  spawnEvents
    .slice()
    .sort((left, right) => left.spawnFrame - right.spawnFrame || left.id.localeCompare(right.id))
    .forEach((event) => {
      const enemyType = enemyTypes[event.enemyTypeId];
      if (!enemyType) {
        throw new Error(`刷怪事件 ${event.id} 引用了不存在的敌人模板 ${event.enemyTypeId}`);
      }

      const route = routes[event.routeId];
      if (!route) {
        throw new Error(`刷怪事件 ${event.id} 引用了不存在的路线 ${event.routeId}`);
      }

      expandSpawnEventFrames(event).forEach((spawnFrame, copyIndex) => {
        expandedEntries.push({
          event,
          enemyType,
          route,
          copyIndex,
          spawnFrame
        });
      });
    });

  expandedEntries.sort(
    (left, right) =>
      left.spawnFrame - right.spawnFrame ||
      left.enemyType.id.localeCompare(right.enemyType.id) ||
      left.event.id.localeCompare(right.event.id) ||
      left.copyIndex - right.copyIndex
  );

  const counters = new Map<string, number>();

  return expandedEntries.map((entry) => {
    const effectiveMoveMode = entry.enemyType.moveModeOverride ?? entry.route.moveMode;
    const nextIndex = (counters.get(entry.enemyType.id) ?? 0) + 1;
    counters.set(entry.enemyType.id, nextIndex);

    return {
      id: `${entry.event.id}:unit:${entry.copyIndex + 1}`,
      enemyTypeId: entry.enemyType.id,
      templateName: entry.enemyType.name,
      instanceIndex: nextIndex,
      displayName: `${entry.enemyType.name}#${nextIndex}`,
      routeId: entry.route.id,
      spawnEventId: entry.event.id,
      spawnFrame: entry.spawnFrame,
      spawnTimeText: formatFrameCount(entry.spawnFrame),
      effectiveMoveMode,
      attributeSpeed: entry.enemyType.attributeSpeed,
      moveMultiplier: entry.enemyType.moveMultiplier,
      steeringFactor: resolveSteering(effectiveMoveMode, entry.enemyType.steeringFactor, 16, 24),
      maxSteeringForce: resolveSteering(effectiveMoveMode, entry.enemyType.maxSteeringForce, 30, 120),
      halfBodyWidth: entry.enemyType.halfBodyWidth,
      footOffset: entry.enemyType.footOffset,
      cursorOffset: entry.enemyType.cursorOffset
    };
  });
}
