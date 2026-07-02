import type {
  EnemyFrameSnapshot,
  EnemyRuntimeState,
  GridPoint,
  MoveMode,
  NormalizedCheckpoint,
  NormalizedEnemy,
  PathMap,
  PreparedRoute,
  PreparedScenario,
  QueryResultItem,
  RoutePathBundle,
  SimulatedEnemy,
  SimulationResult,
  Vec2
} from "../models";
import { FRAME_DT, FRAMES_PER_SECOND } from "../models";
import {
  cellCenter,
  formatRelativePosition,
  parseCell,
  pointToCell,
  sameGridPoint,
  worldToOwnedGrid
} from "../utils/cells";
import { add, clampMagnitude, distance, length, normalize, project, scale, sub, ZERO_VEC } from "../utils/vector";
import { getTile, isCellTraversable, isInBounds } from "../pathfinding/mapAccess";

interface ActiveTarget {
  pathMapId: string;
  targetCell: string;
  targetPoint: Vec2;
}

const CLOCKWISE_OFFSETS: Array<{ x: number; y: number }> = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 }
];

const AVOIDANCE_RECALC_INTERVAL = 1;
const AVOIDANCE_ROUTE_WEIGHT = 0.35;
const AVOIDANCE_RECOVERY_WEIGHT = 1.2;
const AVOIDANCE_MIN_SPEED_FACTOR = 0.35;
const MAX_AVOIDANCE_MAGNITUDE = 0.8;

function createInitialRuntime(enemy: NormalizedEnemy, route: PreparedRoute, pathBundle: RoutePathBundle): EnemyRuntimeState {
  const entityPos = add(route.startPoint, route.spawnOffset);
  const hasConfiguredCursorOffset = enemy.cursorOffset.x !== 0 || enemy.cursorOffset.y !== 0;
  const fixedCursorOffset = hasConfiguredCursorOffset ? enemy.cursorOffset : sub(route.startPoint, entityPos);
  const cursorPos = add(entityPos, fixedCursorOffset);
  const currentTile = pointToCell(worldToOwnedGrid(cursorPos));

  return {
    spawned: true,
    finished: false,
    entityPos,
    cursorPos,
    footPos: add(entityPos, enemy.footOffset),
    inertiaVelocity: ZERO_VEC,
    currentState: "MOVE",
    currentCheckpointIndex: 0,
    visitedNodeSet: new Set<string>(),
    currentTile,
    previousTile: currentTile,
    cachedAvoidanceForce: ZERO_VEC,
    cachedAvoidanceFrame: -999,
    currentPathMapId: pathBundle.endPathId,
    waitStartedFrame: null,
    fixedCursorOffset,
    givenDirection: ZERO_VEC,
    avoidanceForce: ZERO_VEC,
    currentTargetPoint: null
  };
}

function isWithinRadius(position: Vec2, target: Vec2, radius: number): boolean {
  return distance(position, target) <= radius;
}

function resolveActiveTarget(
  state: EnemyRuntimeState,
  route: PreparedRoute,
  pathBundle: RoutePathBundle,
  frame: number
): ActiveTarget | null {
  while (true) {
    const checkpoint = route.checkpoints[state.currentCheckpointIndex];

    if (!checkpoint) {
      state.waitStartedFrame = null;
      if (
        (!route.visitEveryCheckPoint || state.currentCheckpointIndex >= route.checkpoints.length) &&
        isWithinRadius(state.cursorPos, route.endPoint, 0.05)
      ) {
        state.currentState = "FINISHED";
        state.finished = true;
        state.currentTargetPoint = route.endPoint;
        state.givenDirection = ZERO_VEC;
        state.avoidanceForce = ZERO_VEC;
        return null;
      }

      state.currentState = "MOVE";
      return {
        pathMapId: pathBundle.endPathId,
        targetCell: route.endCell,
        targetPoint: route.endPoint
      };
    }

    if (route.ignoreAllButMoveCp && checkpoint.type === "WAIT_FOR_SECONDS") {
      state.currentCheckpointIndex += 1;
      continue;
    }

    if (checkpoint.type === "WAIT_FOR_SECONDS") {
      state.currentState = "WAIT";
      if (state.waitStartedFrame === null) {
        state.waitStartedFrame = frame;
      }

      const waitFrames = Math.max(0, Math.round((checkpoint.seconds ?? 0) * FRAMES_PER_SECOND));
      if (frame - state.waitStartedFrame >= waitFrames) {
        state.currentCheckpointIndex += 1;
        state.waitStartedFrame = null;
        continue;
      }

      state.currentTargetPoint = null;
      state.givenDirection = ZERO_VEC;
      state.avoidanceForce = ZERO_VEC;
      return null;
    }

    state.waitStartedFrame = null;

    if (!checkpoint.targetCell || !checkpoint.targetPoint) {
      state.currentCheckpointIndex += 1;
      continue;
    }

    if (isWithinRadius(state.cursorPos, checkpoint.targetPoint, 0.05)) {
      state.currentCheckpointIndex += 1;
      continue;
    }

    state.currentState = "MOVE";
    return {
      pathMapId: pathBundle.checkpointPathIds[state.currentCheckpointIndex],
      targetCell: checkpoint.targetCell,
      targetPoint: checkpoint.targetPoint
    };
  }
}

function canOccupyTile(moveMode: MoveMode, scenario: PreparedScenario, point: GridPoint): boolean {
  if (!isInBounds(scenario.map, point)) {
    return false;
  }

  const tile = getTile(scenario.map, point);
  if (!tile) {
    return false;
  }

  if (moveMode === "ground") {
    return tile.groundPassable && !tile.obstacle;
  }

  return tile.flyPassable;
}

function resolveDefaultDirection(
  state: EnemyRuntimeState,
  moveMode: MoveMode,
  pathMap: PathMap,
  target: ActiveTarget,
  scenario: PreparedScenario
) {
  const currentPoint = parseCell(state.currentTile);
  if (!isCellTraversable(scenario.map, currentPoint, moveMode)) {
    return { direction: ZERO_VEC, targetPoint: null as Vec2 | null };
  }

  const node = pathMap.nodes[state.currentTile];
  if (!node || !Number.isFinite(node.distanceToTarget)) {
    return { direction: ZERO_VEC, targetPoint: null as Vec2 | null };
  }

  const targetCellPoint = parseCell(target.targetCell);
  const nextPoint = sameGridPoint(node.nextNode, targetCellPoint) ? target.targetPoint : cellCenter(node.nextNode);
  return {
    direction: normalize(sub(nextPoint, state.cursorPos)),
    targetPoint: nextPoint
  };
}

function resolveVisitModeDirection(
  state: EnemyRuntimeState,
  enemy: NormalizedEnemy,
  route: PreparedRoute,
  pathMap: PathMap,
  target: ActiveTarget,
  scenario: PreparedScenario
) {
  const currentPoint = parseCell(state.currentTile);
  if (!isCellTraversable(scenario.map, currentPoint, enemy.effectiveMoveMode)) {
    return resolveDefaultDirection(state, enemy.effectiveMoveMode, pathMap, target, scenario);
  }

  const currentCenter = cellCenter(currentPoint);
  const currentNode = pathMap.nodes[state.currentTile];
  if (!currentNode || !Number.isFinite(currentNode.distanceToTarget)) {
    return { direction: ZERO_VEC, targetPoint: null as Vec2 | null };
  }

  if (route.visitMode === "visitEveryTileCenter") {
    if (!state.visitedNodeSet.has(state.currentTile)) {
      if (isWithinRadius(state.cursorPos, currentCenter, 0.05)) {
        state.visitedNodeSet.add(state.currentTile);
      } else {
        return {
          direction: normalize(sub(currentCenter, state.cursorPos)),
          targetPoint: currentCenter
        };
      }
    }

    return resolveDefaultDirection(state, enemy.effectiveMoveMode, pathMap, target, scenario);
  }

  if (route.visitMode === "visitEveryNodeCenter") {
    if (!state.visitedNodeSet.has(state.currentTile) && isWithinRadius(state.cursorPos, currentCenter, 0.05)) {
      state.visitedNodeSet.add(state.currentTile);
    }

    const nextCell = pointToCell(currentNode.nextNode);
    if (state.visitedNodeSet.has(nextCell)) {
      return resolveDefaultDirection(state, enemy.effectiveMoveMode, pathMap, target, scenario);
    }

    if (
      state.currentTile !== state.previousTile &&
      !state.visitedNodeSet.has(state.currentTile) &&
      isWithinRadius(state.cursorPos, currentCenter, 0.05) === false
    ) {
      return {
        direction: normalize(sub(currentCenter, state.cursorPos)),
        targetPoint: currentCenter
      };
    }

    const nextPoint = sameGridPoint(currentNode.nextNode, parseCell(target.targetCell))
      ? target.targetPoint
      : cellCenter(currentNode.nextNode);
    return {
      direction: normalize(sub(nextPoint, state.cursorPos)),
      targetPoint: nextPoint
    };
  }

  if (route.visitMode === "visitEveryNodeStably") {
    const previousNode = pathMap.nodes[state.previousTile];
    const enteredExpectedNode =
      state.currentTile !== state.previousTile &&
      previousNode &&
      pointToCell(previousNode.nextNode) === state.currentTile;

    if (enteredExpectedNode && !isWithinRadius(state.cursorPos, currentCenter, 0.25)) {
      return {
        direction: normalize(sub(currentCenter, state.cursorPos)),
        targetPoint: currentCenter
      };
    }

    const nextPoint = sameGridPoint(currentNode.nextNode, parseCell(target.targetCell))
      ? target.targetPoint
      : cellCenter(currentNode.nextNode);
    return {
      direction: normalize(sub(nextPoint, state.cursorPos)),
      targetPoint: nextPoint
    };
  }

  return resolveDefaultDirection(state, enemy.effectiveMoveMode, pathMap, target, scenario);
}

function computePassableRecoveryVector(moveMode: MoveMode, scenario: PreparedScenario, currentCell: GridPoint) {
  const currentCenter = cellCenter(currentCell);

  const candidates = CLOCKWISE_OFFSETS.map((offset, index) => {
    const point = {
      x: currentCell.x + offset.x,
      y: currentCell.y + offset.y
    };
    const center = cellCenter(point);
    return {
      index,
      point,
      vector: sub(center, currentCenter),
      distance: distance(center, currentCenter)
    };
  })
    .filter((candidate) => canOccupyTile(moveMode, scenario, candidate.point))
    .sort((left, right) => left.distance - right.distance || left.index - right.index);

  if (candidates.length === 0) {
    return ZERO_VEC;
  }

  return normalize(candidates[0].vector);
}

function computeAvoidanceForce(
  enemy: NormalizedEnemy,
  scenario: PreparedScenario,
  state: EnemyRuntimeState,
  givenDirection: Vec2
): Vec2 {
  const currentCell = parseCell(state.currentTile);
  if (!canOccupyTile(enemy.effectiveMoveMode, scenario, currentCell)) {
    const recovery = computePassableRecoveryVector(enemy.effectiveMoveMode, scenario, currentCell);
    if (length(givenDirection) <= 1e-8) {
      return scale(recovery, MAX_AVOIDANCE_MAGNITUDE);
    }

    return clampMagnitude(sub(recovery, project(recovery, givenDirection)), MAX_AVOIDANCE_MAGNITUDE);
  }

  const center = cellCenter(currentCell);
  let sum = ZERO_VEC;

  CLOCKWISE_OFFSETS.forEach((offset) => {
    const neighbor = {
      x: currentCell.x + offset.x,
      y: currentCell.y + offset.y
    };

    if (!isInBounds(scenario.map, neighbor)) {
      return;
    }

    const tile = getTile(scenario.map, neighbor);
    if (!tile) {
      return;
    }

    const shouldConsider =
      enemy.effectiveMoveMode === "ground" ? !tile.groundPassable || tile.obstacle : !tile.flyPassable;

    if (!shouldConsider) {
      return;
    }

    const samplePoint = {
      x: state.footPos.x + (offset.x < 0 ? -enemy.halfBodyWidth : offset.x > 0 ? enemy.halfBodyWidth : 0),
      y: state.footPos.y
    };

    const relative = sub(samplePoint, center);
    const effectiveX = offset.x === 0 ? 0 : Math.max((offset.x > 0 ? relative.x : -relative.x) - 0.25, 0);
    const effectiveY = offset.y === 0 ? 0 : Math.max((offset.y > 0 ? relative.y : -relative.y) - 0.25, 0);

    if (offset.x === 0 || offset.y === 0) {
      if (offset.x !== 0 && effectiveX > 0) {
        sum = add(sum, { x: -Math.sign(offset.x) * effectiveX, y: 0 });
      }

      if (offset.y !== 0 && effectiveY > 0) {
        sum = add(sum, { x: 0, y: -Math.sign(offset.y) * effectiveY });
      }

      return;
    }

    if (effectiveX > 0 && effectiveY > 0) {
      sum = add(sum, {
        x: -Math.sign(offset.x) * effectiveX,
        y: -Math.sign(offset.y) * effectiveY
      });
    }
  });

  if (length(givenDirection) <= 1e-8) {
    return clampMagnitude(sum, MAX_AVOIDANCE_MAGNITUDE);
  }

  return clampMagnitude(sub(sum, project(sum, givenDirection)), MAX_AVOIDANCE_MAGNITUDE);
}

function reflectOffImpassable(
  enemy: NormalizedEnemy,
  scenario: PreparedScenario,
  entityPos: Vec2,
  displacement: Vec2
) {
  const sourceCell = worldToOwnedGrid(entityPos);
  const destinationPos = add(entityPos, displacement);
  const destinationCell = worldToOwnedGrid(destinationPos);

  if (
    sameGridPoint(sourceCell, destinationCell) ||
    isCellTraversable(scenario.map, destinationCell, enemy.effectiveMoveMode)
  ) {
    return destinationPos;
  }

  const normal = normalize(sub(cellCenter(destinationCell), entityPos));
  const projection = project(displacement, normal);
  const correctedDisplacement = sub(displacement, scale(projection, 2));
  return add(entityPos, correctedDisplacement);
}

function updateTileHistory(state: EnemyRuntimeState) {
  const newTile = pointToCell(worldToOwnedGrid(state.cursorPos));
  if (newTile !== state.currentTile) {
    state.previousTile = state.currentTile;
    state.currentTile = newTile;
  }
}

function createSnapshot(frame: number, state: EnemyRuntimeState): EnemyFrameSnapshot {
  return {
    active: true,
    frame,
    entityPos: { ...state.entityPos },
    cursorPos: { ...state.cursorPos },
    footPos: { ...state.footPos },
    inertiaVelocity: { ...state.inertiaVelocity },
    avoidanceForce: { ...state.avoidanceForce },
    givenDirection: { ...state.givenDirection },
    currentState: state.currentState,
    currentCheckpointIndex: state.currentCheckpointIndex,
    currentPathMapId: state.currentPathMapId,
    currentTargetPoint: state.currentTargetPoint ? { ...state.currentTargetPoint } : null,
    visitedNodeSet: [...state.visitedNodeSet]
  };
}

function advanceEnemyFrame(
  enemy: NormalizedEnemy,
  route: PreparedRoute,
  pathBundle: RoutePathBundle,
  scenario: PreparedScenario,
  state: EnemyRuntimeState,
  frame: number
) {
  const activeTarget = resolveActiveTarget(state, route, pathBundle, frame);

  if (state.finished) {
    return;
  }

  if (!activeTarget || state.currentState !== "MOVE") {
    state.givenDirection = ZERO_VEC;
    state.avoidanceForce = ZERO_VEC;
    return;
  }

  const pathMap = scenario.pathMaps[activeTarget.pathMapId];
  state.currentPathMapId = activeTarget.pathMapId;

  const { direction, targetPoint } = resolveVisitModeDirection(state, enemy, route, pathMap, activeTarget, scenario);
  state.givenDirection = direction;
  state.currentTargetPoint = targetPoint;

  if (frame - state.cachedAvoidanceFrame >= AVOIDANCE_RECALC_INTERVAL) {
    state.cachedAvoidanceForce = computeAvoidanceForce(enemy, scenario, state, direction);
    state.cachedAvoidanceFrame = frame;
  }

  state.avoidanceForce = state.cachedAvoidanceForce;

  const theoreticalSpeed = Math.max(enemy.attributeSpeed, 0.1) * enemy.moveMultiplier;
  const isRecovering = !canOccupyTile(enemy.effectiveMoveMode, scenario, parseCell(state.currentTile));
  const avoidanceWeight = isRecovering ? AVOIDANCE_RECOVERY_WEIGHT : AVOIDANCE_ROUTE_WEIGHT;
  const actualAvoidance = scale(
    state.avoidanceForce,
    avoidanceWeight * Math.max(length(state.inertiaVelocity) / theoreticalSpeed, AVOIDANCE_MIN_SPEED_FACTOR)
  );

  const acceleration = clampMagnitude(
    add(scale(sub(scale(direction, theoreticalSpeed), state.inertiaVelocity), enemy.steeringFactor), actualAvoidance),
    enemy.maxSteeringForce
  );

  const currentVelocity = clampMagnitude(add(state.inertiaVelocity, scale(acceleration, FRAME_DT)), theoreticalSpeed);

  state.inertiaVelocity = currentVelocity;
  const displacement = scale(currentVelocity, FRAME_DT);
  state.entityPos = reflectOffImpassable(enemy, scenario, state.entityPos, displacement);
  state.cursorPos = add(state.entityPos, state.fixedCursorOffset);
  state.footPos = add(state.entityPos, enemy.footOffset);
  updateTileHistory(state);
}

function estimateSafetyFrames(
  enemy: NormalizedEnemy,
  route: PreparedRoute,
  pathBundle: RoutePathBundle,
  scenario: PreparedScenario
) {
  const firstPathId = pathBundle.pathSequence[0]?.id ?? pathBundle.endPathId;
  const firstPath = scenario.pathMaps[firstPathId];
  const routeDistance = firstPath.nodes[route.startCell]?.distanceToEnd ?? 20;
  const waitFrames = route.checkpoints.reduce((sum, checkpoint) => {
    if (checkpoint.type !== "WAIT_FOR_SECONDS") {
      return sum;
    }

    return sum + Math.round((checkpoint.seconds ?? 0) * FRAMES_PER_SECOND);
  }, 0);
  const theoreticalSpeed = Math.max(enemy.attributeSpeed, 0.1) * enemy.moveMultiplier;
  return enemy.spawnFrame + Math.ceil((routeDistance / theoreticalSpeed) * FRAMES_PER_SECOND * 6) + waitFrames + 240;
}

function getRoutePathBundle(route: PreparedRoute, moveMode: MoveMode): RoutePathBundle {
  const bundle = route.pathBundles[moveMode] ?? route.pathBundles[route.moveMode];
  if (!bundle) {
    throw new Error(`路线 ${route.id} 缺少 ${moveMode} 的路径包`);
  }

  return bundle;
}

function simulateEnemy(enemy: NormalizedEnemy, route: PreparedRoute, scenario: PreparedScenario): SimulatedEnemy {
  const frames: Array<EnemyFrameSnapshot | null> = [];
  const trajectory: Vec2[] = [];
  const pathBundle = getRoutePathBundle(route, enemy.effectiveMoveMode);
  const safetyFrames = estimateSafetyFrames(enemy, route, pathBundle, scenario);
  let runtime: EnemyRuntimeState | null = null;
  let finishFrame = enemy.spawnFrame;

  for (let frame = 0; frame <= safetyFrames; frame += 1) {
    if (frame < enemy.spawnFrame) {
      frames[frame] = null;
      continue;
    }

    if (!runtime) {
      runtime = createInitialRuntime(enemy, route, pathBundle);
    }

    if (runtime.finished) {
      finishFrame = frame - 1;
      break;
    }

    const snapshot = createSnapshot(frame, runtime);
    frames[frame] = snapshot;
    trajectory.push({ ...snapshot.entityPos });
    advanceEnemyFrame(enemy, route, pathBundle, scenario, runtime, frame);

    if (runtime.finished) {
      finishFrame = frame;
      break;
    }

    finishFrame = frame;
  }

  return {
    enemy,
    route,
    frames,
    finishFrame,
    trajectory
  };
}

export function simulateScenario(scenario: PreparedScenario): SimulationResult {
  const enemyOrder = scenario.enemies.map((enemy) => enemy.id);
  const enemies = Object.fromEntries(
    scenario.enemies.map((enemy) => {
      const route = scenario.routes[enemy.routeId];
      return [enemy.id, simulateEnemy(enemy, route, scenario)];
    })
  );

  const maxFrame = Math.max(0, ...Object.values(enemies).map((enemy) => enemy.finishFrame));

  return {
    scenario,
    enemies,
    enemyOrder,
    maxFrame
  };
}

export function queryFrame(result: SimulationResult, frame: number): QueryResultItem[] {
  return result.enemyOrder
    .map((enemyId) => {
      const simulated = result.enemies[enemyId];
      const snapshot = simulated.frames[frame];
      if (!snapshot?.active) {
        return null;
      }

      return {
        enemyId,
        name: simulated.enemy.displayName,
        templateName: simulated.enemy.templateName,
        description: `${simulated.enemy.displayName}，${formatRelativePosition(snapshot.entityPos)}`,
        snapshot
      };
    })
    .filter((item): item is QueryResultItem => item !== null);
}
