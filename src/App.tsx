import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { DebugPanel } from "./components/DebugPanel";
import { JsonWorkbench } from "./components/JsonWorkbench";
import { PreviewControls } from "./components/PreviewControls";
import { PreviewTimelineStrip } from "./components/PreviewTimelineStrip";
import { ResultPanel } from "./components/ResultPanel";
import { TimelineEditor } from "./components/TimelineEditor";
import { WorkspaceCanvas } from "./components/WorkspaceCanvas";
import { EnemyTypesPage } from "./components/pages/EnemyTypesPage";
import { PreviewPage } from "./components/pages/PreviewPage";
import { RouteWorkspacePage } from "./components/pages/RouteWorkspacePage";
import { SpawnPlannerPage } from "./components/pages/SpawnPlannerPage";
import { ToolsPage } from "./components/pages/ToolsPage";
import { EnemyTypeEditorPanel } from "./components/panels/EnemyTypeEditorPanel";
import { MapBrushPanel } from "./components/panels/MapBrushPanel";
import { PropertyPanel } from "./components/panels/PropertyPanel";
import { RouteEditorPanel } from "./components/panels/RouteEditorPanel";
import { compileScenario } from "./engine/data/compileScenario";
import { defaultScenario, defaultScenarioJson } from "./engine/data/defaultScenario";
import { prepareScenario } from "./engine/data/prepareScenario";
import type {
  CheckpointInput,
  DebugToggles,
  EnemyTypeInput,
  RouteInput,
  ScenarioInput,
  SimulationResult,
  SpawnEventInput
} from "./engine/models";
import { buildQueryResponse } from "./engine/simulation/query";
import { simulateScenario } from "./engine/simulation/simulator";
import { clampFrame, formatFrameCount, parseTimeString } from "./engine/utils/time";
import { createEnemyType, duplicateEnemyType } from "./editor/models/enemyTypeEditorModel";
import {
  applyBrushToMap,
  clampCellToMap,
  getTerrainAtCell,
  getTerrainLabel,
  rebuildEmptyMap,
  TILE_BRUSHES,
  updateTileObstacleCost
} from "./editor/models/mapEditorModel";
import {
  addCheckpoint,
  clampRouteToMap,
  createRoute,
  getRouteColor,
  moveCheckpoint,
  removeCheckpoint,
  setRouteEndpoint,
  type RoutePlacementMode,
  updateCheckpoint
} from "./editor/models/routeEditorModel";
import { createSpawnEvent, sortSpawnEvents } from "./editor/models/spawnEventModel";

type AppPageId = "preview" | "routes" | "enemyTypes" | "spawns" | "tools";

const TEXT = {
  appEyebrow: "Arknights Stage Toolkit",
  appTitle: "\u660e\u65e5\u65b9\u821f\u5173\u5361\u5de5\u4f5c\u53f0",
  pages: {
    preview: "\u5b9e\u65f6\u9884\u89c8",
    routes: "\u8def\u7ebf\u7f16\u8f91",
    enemyTypes: "\u654c\u4eba\u6a21\u677f",
    spawns: "\u5237\u602a\u7f16\u6392",
    tools: "\u5de5\u5177"
  },
  stats: {
    map: "\u5730\u56fe",
    routes: "\u8def\u7ebf",
    templates: "\u6a21\u677f",
    events: "\u4e8b\u4ef6",
    instances: "\u5b9e\u4f8b",
    currentRoute: "\u5f53\u524d\u8def\u7ebf",
    currentEnemy: "\u5f53\u524d\u6a21\u677f"
  },
  noneSelected: "\u672a\u9009\u62e9",
  brushMode: "\u753b\u7b14\u6a21\u5f0f",
  unselectedPathMap: "\u672a\u9009\u62e9\u8def\u5f84\u56fe"
} as const;

const APP_PAGES: Array<{ id: AppPageId; label: string }> = [
  { id: "preview", label: TEXT.pages.preview },
  { id: "routes", label: TEXT.pages.routes },
  { id: "enemyTypes", label: TEXT.pages.enemyTypes },
  { id: "spawns", label: TEXT.pages.spawns },
  { id: "tools", label: TEXT.pages.tools }
];

const initialToggles: DebugToggles = {
  showNextNode: true,
  showDistanceToTarget: false,
  showDistanceToEnd: false,
  showCursorPos: true,
  showFootPos: false,
  showAvoidanceForce: false,
  showInertiaVelocity: false
};

function buildSimulation(input: ScenarioInput): SimulationResult {
  const prepared = prepareScenario(input);
  const compiled = compileScenario(prepared);
  return simulateScenario(compiled);
}

function ensureSelection<T extends { id: string }>(items: T[], selectedId: string | null): string | null {
  if (selectedId && items.some((item) => item.id === selectedId)) {
    return selectedId;
  }

  return items[0]?.id ?? null;
}

function makeFreshEventDraft(
  events: SpawnEventInput[],
  frame: number,
  enemyTypes: EnemyTypeInput[],
  routes: RouteInput[]
) {
  return createSpawnEvent(events, frame, enemyTypes[0]?.id ?? "", routes[0]?.id ?? "");
}

export default function App() {
  const [scenarioInput, setScenarioInput] = useState<ScenarioInput>(defaultScenario);
  const deferredScenarioInput = useDeferredValue(scenarioInput);
  const [simulation, setSimulation] = useState<SimulationResult>(() => buildSimulation(defaultScenario));
  const [activePage, setActivePage] = useState<AppPageId>("preview");
  const [compileError, setCompileError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [doubleSpeed, setDoubleSpeed] = useState(false);
  const [selectedBrush, setSelectedBrush] = useState<(typeof TILE_BRUSHES)[number]["id"]>("GROUND_BLOCK");
  const [selectedCell, setSelectedCell] = useState<string | null>("A3");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(defaultScenario.routes[0]?.id ?? null);
  const [routePlacementMode, setRoutePlacementMode] = useState<RoutePlacementMode>("idle");
  const [selectedCheckpointIndex, setSelectedCheckpointIndex] = useState<number | null>(null);
  const [selectedEnemyTypeId, setSelectedEnemyTypeId] = useState<string | null>(defaultScenario.enemy_types[0]?.id ?? null);
  const [selectedSpawnEventId, setSelectedSpawnEventId] = useState<string | null>(defaultScenario.spawn_events[0]?.id ?? null);
  const [draftSpawnEvent, setDraftSpawnEvent] = useState<SpawnEventInput>(() =>
    defaultScenario.spawn_events[0] ??
    makeFreshEventDraft(defaultScenario.spawn_events, 0, defaultScenario.enemy_types, defaultScenario.routes)
  );
  const [spawnEventError, setSpawnEventError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("2\u79d28\u5e27");
  const [queryError, setQueryError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState(defaultScenarioJson);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showJsonWorkbench, setShowJsonWorkbench] = useState(false);
  const [pendingMapWidth, setPendingMapWidth] = useState(defaultScenario.map.width);
  const [pendingMapHeight, setPendingMapHeight] = useState(defaultScenario.map.height);
  const [debugToggles, setDebugToggles] = useState(initialToggles);

  const isCompiling = deferredScenarioInput !== scenarioInput;

  useEffect(() => {
    try {
      const nextSimulation = buildSimulation(deferredScenarioInput);
      setSimulation(nextSimulation);
      setCompileError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Compile failed";
      setCompileError(message);
      setIsPlaying(false);
    }
  }, [deferredScenarioInput]);

  useEffect(() => {
    setCurrentFrame((previous) => clampFrame(previous, simulation.maxFrame));
  }, [simulation.maxFrame]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentFrame((previous) => {
        const next = Math.min(simulation.maxFrame, previous + (doubleSpeed ? 2 : 1));
        if (next >= simulation.maxFrame) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 1000 / 30);

    return () => window.clearInterval(timer);
  }, [doubleSpeed, isPlaying, simulation.maxFrame]);

  useEffect(() => {
    setSelectedRouteId((previous) => ensureSelection(scenarioInput.routes, previous));
  }, [scenarioInput.routes]);

  useEffect(() => {
    setSelectedEnemyTypeId((previous) => ensureSelection(scenarioInput.enemy_types, previous));
  }, [scenarioInput.enemy_types]);

  useEffect(() => {
    setSelectedSpawnEventId((previous) => ensureSelection(scenarioInput.spawn_events, previous));
  }, [scenarioInput.spawn_events]);

  useEffect(() => {
    setPendingMapWidth(scenarioInput.map.width);
    setPendingMapHeight(scenarioInput.map.height);
  }, [scenarioInput.map.height, scenarioInput.map.width]);

  useEffect(() => {
    const selectedEvent = scenarioInput.spawn_events.find((event) => event.id === selectedSpawnEventId);
    if (selectedEvent) {
      setDraftSpawnEvent(selectedEvent);
      return;
    }

    setDraftSpawnEvent(makeFreshEventDraft(scenarioInput.spawn_events, currentFrame, scenarioInput.enemy_types, scenarioInput.routes));
  }, [currentFrame, scenarioInput.enemy_types, scenarioInput.routes, scenarioInput.spawn_events, selectedSpawnEventId]);

  const routeColors = useMemo(
    () => Object.fromEntries(scenarioInput.routes.map((route, index) => [route.id, getRouteColor(index)])),
    [scenarioInput.routes]
  );

  const selectedRoute = scenarioInput.routes.find((route) => route.id === selectedRouteId) ?? null;
  const selectedEnemyType = scenarioInput.enemy_types.find((enemyType) => enemyType.id === selectedEnemyTypeId) ?? null;
  const selectedCellTerrain = selectedCell ? getTerrainAtCell(scenarioInput.map, selectedCell) : "NORMAL";
  const selectedTile = selectedCell ? scenarioInput.map.tiles?.find((tile) => tile.cell.toUpperCase() === selectedCell.toUpperCase()) : undefined;
  const queryResponse = buildQueryResponse(simulation, currentFrame);
  const selectedBrushLabel = TILE_BRUSHES.find((brush) => brush.id === selectedBrush)?.label ?? selectedBrush;
  const previewInteractionLabel = `${TEXT.brushMode} / ${selectedBrushLabel}`;

  const debugPathMapId = useMemo(() => {
    if (!selectedRouteId) {
      return simulation.scenario.routes[Object.keys(simulation.scenario.routes)[0]]?.endPathId ?? null;
    }

    const route = simulation.scenario.routes[selectedRouteId];
    if (!route) {
      return null;
    }

    const checkpoint = selectedCheckpointIndex === null ? null : route.checkpoints[selectedCheckpointIndex];
    if (
      selectedCheckpointIndex !== null &&
      checkpoint &&
      (checkpoint.type === "MOVE" || checkpoint.type === "PATROL_MOVE")
    ) {
      return route.checkpointPathIds[selectedCheckpointIndex] ?? route.endPathId;
    }

    return route.endPathId;
  }, [selectedCheckpointIndex, selectedRouteId, simulation.scenario.routes]);

  const debugPathLabel = debugPathMapId
    ? `${debugPathMapId} -> ${simulation.scenario.pathMaps[debugPathMapId]?.targetCell ?? "N/A"}`
    : TEXT.unselectedPathMap;

  const routeModeLabel =
    routePlacementMode === "idle"
      ? TEXT.brushMode
      : routePlacementMode === "setStart"
        ? "\u70b9\u51fb\u5730\u56fe\u8bbe\u7f6e\u8d77\u70b9"
        : routePlacementMode === "setEnd"
          ? "\u70b9\u51fb\u5730\u56fe\u8bbe\u7f6e\u7ec8\u70b9"
          : routePlacementMode === "addMoveCheckpoint"
            ? "\u70b9\u51fb\u5730\u56fe\u6dfb\u52a0 MOVE \u68c0\u67e5\u70b9"
            : "\u70b9\u51fb\u5730\u56fe\u6dfb\u52a0 PATROL_MOVE \u68c0\u67e5\u70b9";

  const activeRouteName = selectedRoute?.name ?? TEXT.noneSelected;
  const activeEnemyName = selectedEnemyType?.name ?? TEXT.noneSelected;

  const updateScenario = (updater: (previous: ScenarioInput) => ScenarioInput) => {
    setScenarioInput((previous) => updater(previous));
  };

  const navigateToPage = (page: AppPageId) => {
    setActivePage(page);
    if (page !== "routes") {
      setRoutePlacementMode("idle");
      setSelectedCheckpointIndex(null);
    }
  };

  const handlePaintCell = (cell: string) => {
    updateScenario((previous) => ({
      ...previous,
      map: applyBrushToMap(previous.map, cell, selectedBrush)
    }));
  };

  const handleRoutePickCell = (cell: string) => {
    if (!selectedRouteId) {
      return;
    }

    const nextCheckpointIndex =
      routePlacementMode === "addMoveCheckpoint" || routePlacementMode === "addPatrolCheckpoint"
        ? (selectedRoute?.checkpoints?.length ?? 0)
        : selectedCheckpointIndex;

    updateScenario((previous) => ({
      ...previous,
      routes: previous.routes.map((route) => {
        if (route.id !== selectedRouteId) {
          return route;
        }

        if (routePlacementMode === "setStart") {
          return setRouteEndpoint(route, "start_point", cell);
        }

        if (routePlacementMode === "setEnd") {
          return setRouteEndpoint(route, "end_point", cell);
        }

        if (routePlacementMode === "addMoveCheckpoint") {
          return addCheckpoint(route, "MOVE", cell);
        }

        if (routePlacementMode === "addPatrolCheckpoint") {
          return addCheckpoint(route, "PATROL_MOVE", cell);
        }

        return route;
      })
    }));

    setSelectedCell(cell);
    setSelectedCheckpointIndex(nextCheckpointIndex);
    setRoutePlacementMode("idle");
  };

  const handleRouteDelete = (routeId: string) => {
    updateScenario((previous) => ({
      ...previous,
      routes: previous.routes.filter((route) => route.id !== routeId),
      spawn_events: previous.spawn_events.filter((event) => event.route_id !== routeId)
    }));
    setSelectedCheckpointIndex(null);
  };

  const handleEnemyTypeDelete = (enemyTypeId: string) => {
    updateScenario((previous) => ({
      ...previous,
      enemy_types: previous.enemy_types.filter((enemyType) => enemyType.id !== enemyTypeId),
      spawn_events: previous.spawn_events.filter((event) => event.enemy_type_id !== enemyTypeId)
    }));
  };

  const handlePrepareSpawnDraft = (frame: number) => {
    setIsPlaying(false);
    setSelectedSpawnEventId(null);
    setDraftSpawnEvent(makeFreshEventDraft(scenarioInput.spawn_events, frame, scenarioInput.enemy_types, scenarioInput.routes));
    setSpawnEventError(null);
  };

  const handleSaveSpawnEvent = () => {
    try {
      parseTimeString(draftSpawnEvent.time);
      setSpawnEventError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid time";
      setSpawnEventError(message);
      return;
    }

    updateScenario((previous) => {
      const exists = previous.spawn_events.some((event) => event.id === draftSpawnEvent.id);
      const nextEvents = exists
        ? previous.spawn_events.map((event) => (event.id === draftSpawnEvent.id ? draftSpawnEvent : event))
        : [...previous.spawn_events, draftSpawnEvent];

      return {
        ...previous,
        spawn_events: sortSpawnEvents(nextEvents)
      };
    });

    setSelectedSpawnEventId(draftSpawnEvent.id);
  };

  const handleDeleteSpawnEvent = (eventId: string) => {
    updateScenario((previous) => ({
      ...previous,
      spawn_events: previous.spawn_events.filter((event) => event.id !== eventId)
    }));
    setSelectedSpawnEventId(null);
    setSpawnEventError(null);
  };

  const handleJumpQuery = () => {
    try {
      const frame = parseTimeString(queryInput);
      setCurrentFrame(clampFrame(frame, Math.max(frame, simulation.maxFrame)));
      setIsPlaying(false);
      setQueryError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid query time";
      setQueryError(message);
    }
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as ScenarioInput;
      setScenarioInput(parsed);
      setJsonError(null);
      setRoutePlacementMode("idle");
      setSelectedCheckpointIndex(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON parse failed";
      setJsonError(message);
    }
  };

  const renderPage = () => {
    if (activePage === "preview") {
      return (
        <PreviewPage
          currentFrameLabel={formatFrameCount(currentFrame)}
          activeRouteName={activeRouteName}
          activeEnemyName={activeEnemyName}
          brushLabel={selectedBrushLabel}
          stage={
            <WorkspaceCanvas
              title={null}
              badge={formatFrameCount(currentFrame)}
              scenario={scenarioInput}
              simulation={simulation}
              currentFrame={currentFrame}
              activeItems={queryResponse.items}
              selectedCell={selectedCell}
              selectedRouteId={selectedRouteId}
              routeColors={routeColors}
              routePlacementMode="idle"
              debugPathMapId={debugPathMapId}
              toggles={debugToggles}
              interactionMode="paint"
              fitMode="contain"
              onSelectCell={setSelectedCell}
              onPaintCell={handlePaintCell}
              onRoutePickCell={handleRoutePickCell}
            />
          }
          side={
            <>
              <PreviewControls
                currentFrame={currentFrame}
                maxFrame={simulation.maxFrame}
                isPlaying={isPlaying}
                doubleSpeed={doubleSpeed}
                isCompiling={isCompiling}
                onPlayPause={() => setIsPlaying((value) => !value)}
                onToggleDoubleSpeed={() => setDoubleSpeed((value) => !value)}
                onStepBackward={() => {
                  setIsPlaying(false);
                  setCurrentFrame((value) => Math.max(0, value - 1));
                }}
                onStepForward={() => {
                  setIsPlaying(false);
                  setCurrentFrame((value) => Math.min(simulation.maxFrame, value + 1));
                }}
                onScrub={(frame) => {
                  setIsPlaying(false);
                  setCurrentFrame(frame);
                }}
              />
              <MapBrushPanel
                width={pendingMapWidth}
                height={pendingMapHeight}
                selectedBrush={selectedBrush}
                brushes={TILE_BRUSHES}
                onWidthChange={setPendingMapWidth}
                onHeightChange={setPendingMapHeight}
                onSelectBrush={setSelectedBrush}
                onRebuildMap={() => {
                  const nextMap = rebuildEmptyMap(scenarioInput.map, pendingMapWidth, pendingMapHeight);
                  updateScenario((previous) => ({
                    ...previous,
                    map: nextMap,
                    routes: previous.routes.map((route) => clampRouteToMap(route, nextMap))
                  }));
                  if (selectedCell) {
                    setSelectedCell(clampCellToMap(selectedCell, nextMap));
                  }
                }}
              />
              <PropertyPanel
                selectedCell={selectedCell}
                terrainLabel={getTerrainLabel(selectedCellTerrain)}
                obstacleCost={selectedTile?.obstacle_cost ?? (selectedCellTerrain === "HIGH_COST_OBSTACLE" ? 1600 : 1000)}
                showObstacleCost={selectedCellTerrain === "OBSTACLE" || selectedCellTerrain === "HIGH_COST_OBSTACLE"}
                interactionLabel={previewInteractionLabel}
                compileError={compileError}
                allowObstacleEditing
                onObstacleCostChange={(value) => {
                  if (!selectedCell) {
                    return;
                  }

                  updateScenario((previous) => ({
                    ...previous,
                    map: updateTileObstacleCost(previous.map, selectedCell, value)
                  }));
                }}
              />
            </>
          }
          timeline={
            <PreviewTimelineStrip
              currentFrame={currentFrame}
              maxFrame={simulation.maxFrame}
              isPlaying={isPlaying}
              events={scenarioInput.spawn_events}
              routeColors={routeColors}
              canCreateAtCurrentFrame={scenarioInput.routes.length > 0 && scenarioInput.enemy_types.length > 0}
              onScrub={(frame) => {
                setIsPlaying(false);
                setCurrentFrame(frame);
              }}
              onOpenPlanner={() => navigateToPage("spawns")}
              onCreateAtCurrentFrame={() => {
                handlePrepareSpawnDraft(currentFrame);
                navigateToPage("spawns");
              }}
            />
          }
        />
      );
    }

    if (activePage === "routes") {
      return (
        <RouteWorkspacePage
          routeName={activeRouteName}
          checkpointCount={selectedRoute?.checkpoints?.length ?? 0}
          interactionLabel={routeModeLabel}
          stage={
            <WorkspaceCanvas
              title={null}
              badge={routeModeLabel}
              scenario={scenarioInput}
              simulation={simulation}
              currentFrame={currentFrame}
              activeItems={queryResponse.items}
              selectedCell={selectedCell}
              selectedRouteId={selectedRouteId}
              routeColors={routeColors}
              routePlacementMode={routePlacementMode}
              debugPathMapId={debugPathMapId}
              toggles={debugToggles}
              interactionMode="route"
              fitMode="natural"
              onSelectCell={setSelectedCell}
              onPaintCell={handlePaintCell}
              onRoutePickCell={handleRoutePickCell}
            />
          }
          side={
            <>
              <RouteEditorPanel
                routes={scenarioInput.routes}
                selectedRouteId={selectedRouteId}
                selectedRoute={selectedRoute}
                routeColors={routeColors}
                placementMode={routePlacementMode}
                selectedCheckpointIndex={selectedCheckpointIndex}
                onSelectRoute={(routeId) => {
                  setSelectedRouteId(routeId);
                  setSelectedCheckpointIndex(null);
                  setRoutePlacementMode("idle");
                }}
                onAddRoute={() => {
                  const nextRoute = createRoute(scenarioInput.routes, scenarioInput.map);
                  updateScenario((previous) => ({
                    ...previous,
                    routes: [...previous.routes, nextRoute]
                  }));
                  setSelectedRouteId(nextRoute.id);
                  setRoutePlacementMode("setStart");
                }}
                onDeleteRoute={handleRouteDelete}
                onRenameRoute={(name) => {
                  if (!selectedRouteId) {
                    return;
                  }

                  updateScenario((previous) => ({
                    ...previous,
                    routes: previous.routes.map((route) => (route.id === selectedRouteId ? { ...route, name } : route))
                  }));
                }}
                onChangeRouteField={(patch) => {
                  if (!selectedRouteId) {
                    return;
                  }

                  updateScenario((previous) => ({
                    ...previous,
                    routes: previous.routes.map((route) => (route.id === selectedRouteId ? { ...route, ...patch } : route))
                  }));
                }}
                onSetPlacementMode={(mode) => setRoutePlacementMode((previous) => (previous === mode ? "idle" : mode))}
                onSelectCheckpoint={setSelectedCheckpointIndex}
                onAddWaitCheckpoint={() => {
                  if (!selectedRouteId) {
                    return;
                  }

                  updateScenario((previous) => ({
                    ...previous,
                    routes: previous.routes.map((route) => (route.id === selectedRouteId ? addCheckpoint(route, "WAIT_FOR_SECONDS") : route))
                  }));
                }}
                onMoveCheckpoint={(index, direction) => {
                  if (!selectedRouteId) {
                    return;
                  }

                  updateScenario((previous) => ({
                    ...previous,
                    routes: previous.routes.map((route) => (route.id === selectedRouteId ? moveCheckpoint(route, index, direction) : route))
                  }));
                }}
                onRemoveCheckpoint={(index) => {
                  if (!selectedRouteId) {
                    return;
                  }

                  updateScenario((previous) => ({
                    ...previous,
                    routes: previous.routes.map((route) => (route.id === selectedRouteId ? removeCheckpoint(route, index) : route))
                  }));
                  setSelectedCheckpointIndex(null);
                }}
                onUpdateCheckpoint={(index, patch) => {
                  if (!selectedRouteId) {
                    return;
                  }

                  updateScenario((previous) => ({
                    ...previous,
                    routes: previous.routes.map((route) =>
                      route.id === selectedRouteId ? updateCheckpoint(route, index, patch as Partial<CheckpointInput>) : route
                    )
                  }));
                }}
              />
              <PropertyPanel
                selectedCell={selectedCell}
                terrainLabel={getTerrainLabel(selectedCellTerrain)}
                obstacleCost={selectedTile?.obstacle_cost ?? (selectedCellTerrain === "HIGH_COST_OBSTACLE" ? 1600 : 1000)}
                showObstacleCost={selectedCellTerrain === "OBSTACLE" || selectedCellTerrain === "HIGH_COST_OBSTACLE"}
                interactionLabel={routeModeLabel}
                compileError={compileError}
              />
            </>
          }
        />
      );
    }

    if (activePage === "enemyTypes") {
      return (
        <EnemyTypesPage
          selectedEnemyName={activeEnemyName}
          totalTemplates={scenarioInput.enemy_types.length}
          editor={
            <EnemyTypeEditorPanel
              enemyTypes={scenarioInput.enemy_types}
              selectedEnemyTypeId={selectedEnemyTypeId}
              selectedEnemyType={selectedEnemyType}
              onSelectEnemyType={setSelectedEnemyTypeId}
              onAddEnemyType={() => {
                const nextEnemyType = createEnemyType(scenarioInput.enemy_types);
                updateScenario((previous) => ({
                  ...previous,
                  enemy_types: [...previous.enemy_types, nextEnemyType]
                }));
                setSelectedEnemyTypeId(nextEnemyType.id);
              }}
              onDuplicateEnemyType={(enemyTypeId) => {
                const source = scenarioInput.enemy_types.find((enemyType) => enemyType.id === enemyTypeId);
                if (!source) {
                  return;
                }

                const nextEnemyType = duplicateEnemyType(source, scenarioInput.enemy_types);
                updateScenario((previous) => ({
                  ...previous,
                  enemy_types: [...previous.enemy_types, nextEnemyType]
                }));
                setSelectedEnemyTypeId(nextEnemyType.id);
              }}
              onDeleteEnemyType={handleEnemyTypeDelete}
              onChangeEnemyType={(patch) => {
                if (!selectedEnemyTypeId) {
                  return;
                }

                updateScenario((previous) => ({
                  ...previous,
                  enemy_types: previous.enemy_types.map((enemyType) =>
                    enemyType.id === selectedEnemyTypeId ? { ...enemyType, ...patch } : enemyType
                  )
                }));
              }}
            />
          }
        />
      );
    }

    if (activePage === "spawns") {
      return (
        <SpawnPlannerPage
          currentFrameLabel={formatFrameCount(currentFrame)}
          eventCount={scenarioInput.spawn_events.length}
          instanceCount={simulation.enemyOrder.length}
          timeline={
            <TimelineEditor
              currentFrame={currentFrame}
              maxFrame={simulation.maxFrame}
              isPlaying={isPlaying}
              error={spawnEventError}
              events={scenarioInput.spawn_events}
              selectedEventId={selectedSpawnEventId}
              draft={draftSpawnEvent}
              routes={scenarioInput.routes}
              enemyTypes={scenarioInput.enemy_types}
              routeColors={routeColors}
              onScrub={(frame) => {
                setIsPlaying(false);
                setCurrentFrame(frame);
              }}
              onSelectEvent={(eventId) => {
                setSelectedSpawnEventId(eventId);
                setSpawnEventError(null);
              }}
              onDraftChange={(patch) => {
                setDraftSpawnEvent((previous) => ({ ...previous, ...patch }));
                setSpawnEventError(null);
              }}
              onSaveDraft={handleSaveSpawnEvent}
              onDeleteEvent={handleDeleteSpawnEvent}
              onPrepareNew={() => handlePrepareSpawnDraft(currentFrame)}
              onCreateAtCurrentFrame={() => handlePrepareSpawnDraft(currentFrame)}
            />
          }
        />
      );
    }

    return (
      <ToolsPage
        debugPathLabel={debugPathLabel}
        query={
          <ResultPanel value={queryInput} error={queryError} response={queryResponse} onChange={setQueryInput} onQuery={handleJumpQuery} />
        }
        debug={
          <DebugPanel
            toggles={debugToggles}
            debugPathLabel={debugPathLabel}
            onToggle={(key) =>
              setDebugToggles((previous) => ({
                ...previous,
                [key]: !previous[key]
              }))
            }
          />
        }
        json={
          <JsonWorkbench
            expanded={showJsonWorkbench}
            value={jsonText}
            error={jsonError}
            onToggle={() => setShowJsonWorkbench((value) => !value)}
            onChange={setJsonText}
            onSyncFromScenario={() => {
              setJsonText(JSON.stringify(scenarioInput, null, 2));
              setJsonError(null);
            }}
            onApply={handleApplyJson}
          />
        }
      />
    );
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <p className="app-header__eyebrow">{TEXT.appEyebrow}</p>
          <h1>{TEXT.appTitle}</h1>
        </div>

        <nav className="app-nav" aria-label="Workspace pages">
          {APP_PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              className={`app-nav__button ${activePage === page.id ? "is-active" : ""}`}
              onClick={() => navigateToPage(page.id)}
            >
              {page.label}
            </button>
          ))}
        </nav>

        <div className="app-status">
          <span className="status-chip">{`${TEXT.stats.map} ${scenarioInput.map.width} x ${scenarioInput.map.height}`}</span>
          <span className="status-chip">{`${TEXT.stats.routes} ${scenarioInput.routes.length}`}</span>
          <span className="status-chip">{`${TEXT.stats.templates} ${scenarioInput.enemy_types.length}`}</span>
          <span className="status-chip">{`${TEXT.stats.events} ${scenarioInput.spawn_events.length}`}</span>
          <span className="status-chip">{`${TEXT.stats.instances} ${simulation.enemyOrder.length}`}</span>
          <span className="status-chip">{formatFrameCount(currentFrame)}</span>
          <span className="status-chip">{`${TEXT.stats.currentRoute} ${activeRouteName}`}</span>
          <span className="status-chip">{`${TEXT.stats.currentEnemy} ${activeEnemyName}`}</span>
        </div>
      </header>

      <main className="app-main">{renderPage()}</main>
    </div>
  );
}
