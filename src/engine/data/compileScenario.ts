import type {
  MoveMode,
  NormalizedCheckpoint,
  PathMap,
  PreparedRoute,
  PreparedScenario,
  RoutePathBundle,
  RoutePathReference,
  ScenarioDraft
} from "../models";
import { buildReversePathMap, clonePathMap, flattenPathMap } from "../pathfinding/reversePathMap";
import { expandSpawnEvents } from "./spawnExpansion";

function isMovementCheckpoint(checkpoint: NormalizedCheckpoint) {
  return checkpoint.type === "MOVE" || checkpoint.type === "PATROL_MOVE";
}

function compileRouteBundle(
  prepared: ScenarioDraft,
  route: ScenarioDraft["routes"][string],
  moveMode: MoveMode,
  rawCache: Map<string, PathMap>,
  pathMaps: Record<string, PathMap>
): RoutePathBundle {
  const pathSequence: RoutePathReference[] = [];
  const checkpointPathIds: Record<number, string> = {};

  route.checkpoints.forEach((checkpoint, checkpointIndex) => {
    if (!isMovementCheckpoint(checkpoint) || !checkpoint.targetCell) {
      return;
    }

    const cacheKey = `${moveMode}:${checkpoint.targetCell}`;
    const routePathId = `${route.id}:${moveMode}:cp:${checkpointIndex}:${checkpoint.targetCell}`;
    let baseMap = rawCache.get(cacheKey);

    if (!baseMap) {
      baseMap = buildReversePathMap(prepared.map, moveMode, checkpoint.targetCell, `cache:${cacheKey}`);
      rawCache.set(cacheKey, baseMap);
    }

    const routeMap = clonePathMap(baseMap, routePathId);
    pathMaps[routePathId] = route.allowDiagonalMove ? flattenPathMap(routeMap, prepared.map) : routeMap;
    checkpointPathIds[checkpointIndex] = routePathId;
    pathSequence.push({
      id: routePathId,
      targetCell: checkpoint.targetCell,
      checkpointIndex,
      isEnd: false
    });
  });

  const endCacheKey = `${moveMode}:${route.endCell}`;
  const endPathId = `${route.id}:${moveMode}:end:${route.endCell}`;
  let endBaseMap = rawCache.get(endCacheKey);
  if (!endBaseMap) {
    endBaseMap = buildReversePathMap(prepared.map, moveMode, route.endCell, `cache:${endCacheKey}`);
    rawCache.set(endCacheKey, endBaseMap);
  }

  const routeEndMap = clonePathMap(endBaseMap, endPathId);
  pathMaps[endPathId] = route.allowDiagonalMove ? flattenPathMap(routeEndMap, prepared.map) : routeEndMap;
  pathSequence.push({
    id: endPathId,
    targetCell: route.endCell,
    checkpointIndex: null,
    isEnd: true
  });

  for (let index = pathSequence.length - 1; index >= 0; index -= 1) {
    const currentRef = pathSequence[index];
    const currentMap = pathMaps[currentRef.id];

    if (index === pathSequence.length - 1) {
      Object.values(currentMap.nodes).forEach((node) => {
        node.distanceToEnd = node.distanceToTarget;
      });
      continue;
    }

    const nextRef = pathSequence[index + 1];
    const nextMap = pathMaps[nextRef.id];
    const bridgeDistance = nextMap.nodes[currentRef.targetCell]?.distanceToEnd ?? Number.POSITIVE_INFINITY;

    Object.values(currentMap.nodes).forEach((node) => {
      node.distanceToEnd = node.distanceToTarget + bridgeDistance;
    });
  }

  return {
    moveMode,
    pathSequence,
    checkpointPathIds,
    endPathId
  };
}

function collectRequiredModes(prepared: ScenarioDraft) {
  const required = new Map<string, Set<MoveMode>>();

  Object.values(prepared.routes).forEach((route) => {
    required.set(route.id, new Set<MoveMode>([route.moveMode]));
  });

  prepared.spawnEvents.forEach((event) => {
    const route = prepared.routes[event.routeId];
    const enemyType = prepared.enemyTypes[event.enemyTypeId];
    if (!route || !enemyType) {
      return;
    }

    required.get(route.id)?.add(enemyType.moveModeOverride ?? route.moveMode);
  });

  return required;
}

export function compileScenario(prepared: ScenarioDraft): PreparedScenario {
  const rawCache = new Map<string, PathMap>();
  const pathMaps: Record<string, PathMap> = {};
  const requiredModes = collectRequiredModes(prepared);

  const compiledRoutes = Object.fromEntries(
    Object.values(prepared.routes).map((route): [string, PreparedRoute] => {
      const modeSet = requiredModes.get(route.id) ?? new Set<MoveMode>([route.moveMode]);
      const pathBundles: PreparedRoute["pathBundles"] = {};

      modeSet.forEach((mode) => {
        pathBundles[mode] = compileRouteBundle(prepared, route, mode, rawCache, pathMaps);
      });

      const defaultBundle = pathBundles[route.moveMode];
      if (!defaultBundle) {
        throw new Error(`路线 ${route.id} 缺少默认移动模式 ${route.moveMode} 的寻路图`);
      }

      return [
        route.id,
        {
          ...route,
          pathBundles,
          pathSequence: defaultBundle.pathSequence,
          checkpointPathIds: defaultBundle.checkpointPathIds,
          endPathId: defaultBundle.endPathId
        }
      ];
    })
  );

  const enemies = expandSpawnEvents(prepared.enemyTypes, prepared.routes, prepared.spawnEvents);

  enemies.forEach((enemy) => {
    const route = compiledRoutes[enemy.routeId];
    if (!route.pathBundles[enemy.effectiveMoveMode]) {
      throw new Error(`敌人 ${enemy.id} 需要 ${enemy.effectiveMoveMode} 寻路图，但路线 ${route.id} 未成功编译`);
    }
  });

  return {
    ...prepared,
    routes: compiledRoutes,
    enemies,
    pathMaps
  };
}
