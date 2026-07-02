export const FRAMES_PER_SECOND = 30;
export const FRAME_DT = 1 / FRAMES_PER_SECOND;

export type TerrainType =
  | "NORMAL"
  | "GROUND_BLOCK"
  | "FLY_BLOCK"
  | "OBSTACLE"
  | "HIGH_COST_OBSTACLE";
export type MoveMode = "ground" | "fly";
export type CheckpointType = "MOVE" | "PATROL_MOVE" | "WAIT_FOR_SECONDS";
export type EnemyStateName =
  | "MOVE"
  | "WAIT"
  | "FINISHED"
  | "STUN"
  | "BIND"
  | "BLOCKED"
  | "TELEPORT"
  | "APPEAR"
  | "DISAPPEAR";
export type VisitMode =
  | "default"
  | "visitEveryTileCenter"
  | "visitEveryNodeCenter"
  | "visitEveryNodeStably";

export interface Vec2 {
  x: number;
  y: number;
}

export interface GridPoint {
  x: number;
  y: number;
}

export interface TileInput {
  cell: string;
  terrain?: TerrainType;
  obstacle_cost?: number;
  ground_passable?: boolean;
  fly_passable?: boolean;
  obstacle?: boolean;
}

export interface MapInput {
  width: number;
  height: number;
  tiles?: TileInput[];
}

export interface CheckpointInput {
  id?: string;
  type: CheckpointType;
  target?: string;
  offset?: [number, number];
  seconds?: number;
}

export interface RouteInput {
  id: string;
  name: string;
  move_mode: MoveMode;
  allowDiagonalMove?: boolean;
  visitEveryTileCenter?: boolean;
  visitEveryNodeCenter?: boolean;
  visitEveryNodeStably?: boolean;
  visitEveryCheckPoint?: boolean;
  ignoreAllButMoveCp?: boolean;
  start_point: string;
  spawn_offset?: [number, number];
  end_point: string;
  checkpoints?: CheckpointInput[];
}

export interface EnemyTypeInput {
  id: string;
  name: string;
  move_mode_override?: MoveMode | null;
  attribute_speed: number;
  moveMultiplier?: number;
  steeringFactor?: number;
  maxSteeringForce?: number;
  halfBodyWidth?: number;
  footOffset?: [number, number];
  cursor_offset?: [number, number];
}

export interface SpawnEventInput {
  id: string;
  time: string;
  enemy_type_id: string;
  route_id: string;
  count?: number;
  interval_frames?: number;
}

export interface ScenarioInput {
  map: MapInput;
  routes: RouteInput[];
  enemy_types: EnemyTypeInput[];
  spawn_events: SpawnEventInput[];
}

export interface NormalizedTile {
  cell: string;
  point: GridPoint;
  terrain: TerrainType;
  groundPassable: boolean;
  flyPassable: boolean;
  obstacle: boolean;
  obstacleCost: number;
}

export interface NormalizedMap {
  width: number;
  height: number;
  tilesByCell: Record<string, NormalizedTile>;
}

export interface NormalizedCheckpoint {
  id: string;
  type: CheckpointType;
  targetCell?: string;
  targetPoint?: Vec2;
  offset: Vec2;
  seconds?: number;
}

export interface NormalizedRoute {
  id: string;
  name: string;
  moveMode: MoveMode;
  allowDiagonalMove: boolean;
  visitEveryCheckPoint: boolean;
  ignoreAllButMoveCp: boolean;
  visitMode: VisitMode;
  startCell: string;
  startPoint: Vec2;
  spawnOffset: Vec2;
  endCell: string;
  endPoint: Vec2;
  checkpoints: NormalizedCheckpoint[];
}

export interface NormalizedEnemyType {
  id: string;
  name: string;
  moveModeOverride: MoveMode | null;
  attributeSpeed: number;
  moveMultiplier: number;
  steeringFactor: number | null;
  maxSteeringForce: number | null;
  halfBodyWidth: number;
  footOffset: Vec2;
  cursorOffset: Vec2;
}

export interface NormalizedSpawnEvent {
  id: string;
  timeText: string;
  spawnFrame: number;
  enemyTypeId: string;
  routeId: string;
  count: number;
  intervalFrames: number;
}

export interface NormalizedEnemy {
  id: string;
  enemyTypeId: string;
  templateName: string;
  instanceIndex: number;
  displayName: string;
  routeId: string;
  spawnEventId: string;
  spawnFrame: number;
  spawnTimeText: string;
  effectiveMoveMode: MoveMode;
  attributeSpeed: number;
  moveMultiplier: number;
  steeringFactor: number;
  maxSteeringForce: number;
  halfBodyWidth: number;
  footOffset: Vec2;
  cursorOffset: Vec2;
}

export interface PathNodeRecord {
  cell: GridPoint;
  distanceToTarget: number;
  nextNode: GridPoint;
  distanceToEnd: number;
}

export interface PathMap {
  id: string;
  cacheKey: string;
  moveMode: MoveMode;
  targetCell: string;
  targetPoint: GridPoint;
  nodes: Record<string, PathNodeRecord>;
}

export interface RoutePathReference {
  id: string;
  targetCell: string;
  checkpointIndex: number | null;
  isEnd: boolean;
}

export interface RoutePathBundle {
  moveMode: MoveMode;
  pathSequence: RoutePathReference[];
  checkpointPathIds: Record<number, string>;
  endPathId: string;
}

export interface PreparedRoute extends NormalizedRoute {
  pathBundles: Partial<Record<MoveMode, RoutePathBundle>>;
  pathSequence: RoutePathReference[];
  checkpointPathIds: Record<number, string>;
  endPathId: string;
}

export interface ScenarioDraft {
  map: NormalizedMap;
  routes: Record<string, NormalizedRoute>;
  enemyTypes: Record<string, NormalizedEnemyType>;
  spawnEvents: NormalizedSpawnEvent[];
  pathMaps: Record<string, PathMap>;
}

export interface PreparedScenario {
  map: NormalizedMap;
  routes: Record<string, PreparedRoute>;
  enemyTypes: Record<string, NormalizedEnemyType>;
  spawnEvents: NormalizedSpawnEvent[];
  enemies: NormalizedEnemy[];
  pathMaps: Record<string, PathMap>;
}

export interface EnemyRuntimeState {
  spawned: boolean;
  finished: boolean;
  entityPos: Vec2;
  cursorPos: Vec2;
  footPos: Vec2;
  inertiaVelocity: Vec2;
  currentState: EnemyStateName;
  currentCheckpointIndex: number;
  visitedNodeSet: Set<string>;
  currentTile: string;
  previousTile: string;
  cachedAvoidanceForce: Vec2;
  cachedAvoidanceFrame: number;
  currentPathMapId: string;
  waitStartedFrame: number | null;
  fixedCursorOffset: Vec2;
  givenDirection: Vec2;
  avoidanceForce: Vec2;
  currentTargetPoint: Vec2 | null;
}

export interface EnemyFrameSnapshot {
  active: boolean;
  frame: number;
  entityPos: Vec2;
  cursorPos: Vec2;
  footPos: Vec2;
  inertiaVelocity: Vec2;
  avoidanceForce: Vec2;
  givenDirection: Vec2;
  currentState: EnemyStateName;
  currentCheckpointIndex: number;
  currentPathMapId: string;
  currentTargetPoint: Vec2 | null;
  visitedNodeSet: string[];
}

export interface SimulatedEnemy {
  enemy: NormalizedEnemy;
  route: PreparedRoute;
  frames: Array<EnemyFrameSnapshot | null>;
  finishFrame: number;
  trajectory: Vec2[];
}

export interface SimulationResult {
  scenario: PreparedScenario;
  enemies: Record<string, SimulatedEnemy>;
  enemyOrder: string[];
  maxFrame: number;
}

export interface QueryResultItem {
  enemyId: string;
  name: string;
  templateName: string;
  description: string;
  snapshot: EnemyFrameSnapshot;
}

export interface DebugToggles {
  showNextNode: boolean;
  showDistanceToTarget: boolean;
  showDistanceToEnd: boolean;
  showCursorPos: boolean;
  showFootPos: boolean;
  showAvoidanceForce: boolean;
  showInertiaVelocity: boolean;
}
