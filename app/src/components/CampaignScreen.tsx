import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { LevelDefinition } from "@thesis/game-system";
import {
  JsonCampaignWorldRepository,
  JsonLevelRepository,
  LocalProgressRepository,
  type CampaignWorldDefinition
} from "@thesis/storage";
import { Screen } from "@thesis/ui-editor";
import { APP_ROUTES } from "../types/routes";
import { ScreenHeader } from "./ui/ScreenHeader";
import { tutorialAnchorProps } from "../features/tutorial/anchors";
import { useTutorial } from "../features/tutorial/TutorialProvider";
import {
  hasSeenCampaignWorldTutorial,
  markCampaignWorldTutorialSeen
} from "../features/tutorial/storage";

const levelRepository = new JsonLevelRepository();
const worldRepository = new JsonCampaignWorldRepository();
const progressRepository = new LocalProgressRepository();

interface WorldProgress {
  world: CampaignWorldDefinition;
  completed: number;
  total: number;
  unlocked: boolean;
}

interface AvatarPosition {
  x: number;
  y: number;
}

type PositionedNode = CampaignWorldDefinition["nodes"][number] & {
  x: number;
  y: number;
};

const CAMPAIGN_FIRST_VISIT_KEY = "visual-data-structures-campaign-first-visit-v1";
const CAMPAIGN_POSITION_KEY = "visual-data-structures-campaign-position-v2";

const formatDifficultyScore = (difficulty: number): string => difficulty.toFixed(1);
const easeInOut = (t: number): number => 0.5 - Math.cos(Math.PI * t) / 2;
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

const buildAdjacencyMap = (world: CampaignWorldDefinition): Map<string, string[]> => {
  const adjacency = new Map<string, string[]>();

  world.nodes.forEach((node) => {
    adjacency.set(node.id, []);
  });

  world.edges.forEach((edge) => {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  });

  return adjacency;
};

const findNodePath = (
  world: CampaignWorldDefinition,
  startNodeId: string,
  targetNodeId: string
): string[] => {
  if (startNodeId === targetNodeId) {
    return [startNodeId];
  }

  const adjacency = buildAdjacencyMap(world);
  const queue: string[] = [startNodeId];
  const visited = new Set<string>([startNodeId]);
  const previousByNode = new Map<string, string | null>([[startNodeId, null]]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      previousByNode.set(neighbor, current);

      if (neighbor === targetNodeId) {
        const path: string[] = [targetNodeId];
        let cursor: string | null = current;
        while (cursor) {
          path.unshift(cursor);
          cursor = previousByNode.get(cursor) ?? null;
        }
        return path;
      }

      queue.push(neighbor);
    }
  }

  return [startNodeId, targetNodeId];
};

const getPositionedNodes = (world: CampaignWorldDefinition): PositionedNode[] => {
  const grid = world.grid;
  const marginX = grid?.marginX ?? 10;
  const marginY = grid?.marginY ?? 14;
  const gridWidth = 100 - marginX * 2;
  const gridHeight = 100 - marginY * 2;

  return world.nodes.map((node) => {
    if (grid && typeof node.gridCol === "number" && typeof node.gridRow === "number") {
      const colSpan = Math.max(1, grid.columns - 1);
      const rowSpan = Math.max(1, grid.rows - 1);
      return {
        ...node,
        x: marginX + (node.gridCol / colSpan) * gridWidth,
        y: marginY + (node.gridRow / rowSpan) * gridHeight
      };
    }

    return {
      ...node,
      x: node.x ?? 50,
      y: node.y ?? 50
    };
  });
};

const loadCampaignPosition = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(CAMPAIGN_POSITION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
};

const saveCampaignPosition = (worldId: string, nodeId: string): void => {
  const previous = loadCampaignPosition();
  localStorage.setItem(CAMPAIGN_POSITION_KEY, JSON.stringify({ ...previous, [worldId]: nodeId }));
};

const resolveCurrentNodeId = (world: CampaignWorldDefinition): string | null => {
  if (world.nodes.length === 0) return null;
  const stored = loadCampaignPosition()[world.id];
  if (stored && world.nodes.some((node) => node.id === stored)) {
    return stored;
  }
  return world.startNodeId ?? world.nodes[0]?.id ?? null;
};

const resolveWorldEntryNodeId = (world: CampaignWorldDefinition): string | null =>
  world.startNodeId ?? world.nodes[0]?.id ?? null;

const resolveWorldExitNodeId = (world: CampaignWorldDefinition): string | null =>
  world.nodes[world.nodes.length - 1]?.id ?? resolveWorldEntryNodeId(world);

const isPlayableNode = (node: CampaignWorldDefinition["nodes"][number]): boolean =>
  typeof node.levelId === "string" && node.levelId.length > 0;

const getWorldProgress = (
  worlds: CampaignWorldDefinition[],
  completedLevelIds: string[]
): WorldProgress[] => {
  const completedLevelSet = new Set(completedLevelIds);

  return worlds.map((world, index) => {
    const playableNodes = world.nodes.filter(isPlayableNode);
    const completed = playableNodes.filter((node) => completedLevelSet.has(node.levelId)).length;
    const total = playableNodes.length;
    const previousWorld = worlds[index - 1];
    const previousCompleted = previousWorld
      ? previousWorld.nodes.filter((node) => isPlayableNode(node) && completedLevelSet.has(node.levelId)).length
      : 0;
    const previousTotal = previousWorld?.nodes.filter(isPlayableNode).length ?? 0;

    return {
      world,
      completed,
      total,
      unlocked: index === 0 || previousCompleted >= previousTotal
    };
  });
};

export function CampaignScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startTutorial } = useTutorial();
  const [levelsById, setLevelsById] = useState<Record<string, LevelDefinition>>({});
  const [worlds, setWorlds] = useState<CampaignWorldDefinition[]>([]);
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>([]);
  const [activeWorldId, setActiveWorldId] = useState<string>("");
  const [error, setError] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [currentNodeId, setCurrentNodeId] = useState("");
  const [avatarPosition, setAvatarPosition] = useState<AvatarPosition>({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const hasHandledFirstVisitRef = useRef(false);
  const worldTransitionRef = useRef<{ targetWorldId: string } | null>(null);
  const autoTutorialWorldIdRef = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [levels, progress, loadedWorlds] = await Promise.all([
          levelRepository.listLevels(),
          progressRepository.loadProgress(),
          worldRepository.listWorlds()
        ]);

        const nextLevelsById: Record<string, LevelDefinition> = {};
        levels.forEach((level) => {
          nextLevelsById[level.id] = level;
        });

        setLevelsById(nextLevelsById);
        setCompletedLevelIds(progress.completedLevelIds);
        setWorlds(loadedWorlds);
        setActiveWorldId(loadedWorlds[0]?.id ?? "");
        setError("");

        if (!hasHandledFirstVisitRef.current && !localStorage.getItem(CAMPAIGN_FIRST_VISIT_KEY)) {
          hasHandledFirstVisitRef.current = true;
          localStorage.setItem(CAMPAIGN_FIRST_VISIT_KEY, "1");
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t("playSession.couldNotLoadCampaign"));
      }
    };

    void load();
  }, []);

  const progressByWorld = useMemo(
    () => getWorldProgress(worlds, completedLevelIds),
    [completedLevelIds, worlds]
  );

  useEffect(() => {
    if (progressByWorld.length === 0) return;
    if (progressByWorld.some((worldProgress) => worldProgress.world.id === activeWorldId)) return;
    setActiveWorldId(progressByWorld[0]?.world.id ?? "");
  }, [activeWorldId, progressByWorld]);

  const activeWorldProgress = useMemo(
    () => progressByWorld.find((worldProgress) => worldProgress.world.id === activeWorldId) ?? null,
    [activeWorldId, progressByWorld]
  );
  const activeWorld = activeWorldProgress?.world ?? null;

  const totalCompleted = useMemo(
    () => progressByWorld.reduce((acc, worldProgress) => acc + worldProgress.completed, 0),
    [progressByWorld]
  );

  const totalLevels = useMemo(
    () => progressByWorld.reduce((acc, worldProgress) => acc + worldProgress.total, 0),
    [progressByWorld]
  );

  const positionedNodes = useMemo(
    () => (activeWorld ? getPositionedNodes(activeWorld) : []),
    [activeWorld]
  );

  const nodesById = useMemo(
    () => new Map(positionedNodes.map((node) => [node.id, node])),
    [positionedNodes]
  );

  const completedNodeIds = useMemo(() => {
    if (!activeWorld) return new Set<string>();
    const completedLevels = new Set(completedLevelIds);
    return new Set(
      activeWorld.nodes
        .filter((node) => isPlayableNode(node) && completedLevels.has(node.levelId))
        .map((node) => node.id)
    );
  }, [activeWorld, completedLevelIds]);

  useEffect(() => {
    if (!activeWorld || activeWorld.nodes.length === 0) {
      setSelectedNodeId("");
      setCurrentNodeId("");
      setAvatarPosition({ x: 0, y: 0 });
      return;
    }

    if (worldTransitionRef.current?.targetWorldId === activeWorld.id) {
      return;
    }

    const resolvedCurrent = resolveCurrentNodeId(activeWorld);
    if (!resolvedCurrent) return;

    const currentNode = nodesById.get(resolvedCurrent);
    if (!currentNode) return;

    setCurrentNodeId(currentNode.id);
    setSelectedNodeId(currentNode.id);
    setAvatarPosition({ x: currentNode.x, y: currentNode.y });
    setIsMobilePanelOpen(false);
    saveCampaignPosition(activeWorld.id, currentNode.id);
  }, [activeWorld, nodesById]);

  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;
  const selectedLevel = selectedNode?.levelId ? levelsById[selectedNode.levelId] : null;
  const isFirstWorldStartNode =
    Boolean(activeWorld) &&
    worlds[0]?.id === activeWorld?.id &&
    selectedNode?.id === activeWorld?.startNodeId;

  const animateAvatarBetweenPoints = async (
    from: AvatarPosition,
    to: AvatarPosition,
    durationMs: number
  ): Promise<void> => {
    const startAt = performance.now();

    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const progress = Math.min(1, (now - startAt) / durationMs);
        const eased = easeInOut(progress);
        setAvatarPosition({
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased
        });

        if (progress < 1) {
          window.requestAnimationFrame(step);
          return;
        }

        setAvatarPosition(to);
        resolve();
      };

      window.requestAnimationFrame(step);
    });
  };

  const animatePathWithinWorld = async (
    world: CampaignWorldDefinition,
    worldNodesById: Map<string, PositionedNode>,
    sourceNodeId: string,
    targetNodeId: string,
    options?: { savePositionAtEnd?: boolean; selectAtEnd?: boolean }
  ): Promise<void> => {
    const targetNode = worldNodesById.get(targetNodeId);
    const sourceNode = worldNodesById.get(sourceNodeId);
    if (!sourceNode || !targetNode) return;

    const nodePath = findNodePath(world, sourceNodeId, targetNodeId)
      .map((nodeId) => worldNodesById.get(nodeId))
      .filter((node): node is PositionedNode => Boolean(node));

    if (nodePath.length < 2) {
      setCurrentNodeId(targetNode.id);
      setAvatarPosition({ x: targetNode.x, y: targetNode.y });
      if (options?.selectAtEnd !== false) {
        setSelectedNodeId(targetNode.id);
      }
      if (options?.savePositionAtEnd !== false) {
        saveCampaignPosition(world.id, targetNode.id);
      }
      return;
    }

    for (let segmentIndex = 0; segmentIndex < nodePath.length - 1; segmentIndex += 1) {
      const fromNode = nodePath[segmentIndex];
      const toNode = nodePath[segmentIndex + 1];
      const distance = Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y);
      const durationMs = Math.max(220, Math.min(520, distance * 18));

      await animateAvatarBetweenPoints(
        { x: fromNode.x, y: fromNode.y },
        { x: toNode.x, y: toNode.y },
        durationMs
      );
      setCurrentNodeId(toNode.id);
    }

    if (options?.selectAtEnd !== false) {
      setSelectedNodeId(targetNode.id);
    }
    if (options?.savePositionAtEnd !== false) {
      saveCampaignPosition(world.id, targetNode.id);
    }
  };

  const animateToNode = async (targetNode: PositionedNode) => {
    const sourceNode = nodesById.get(currentNodeId);
    if (!sourceNode || !activeWorld) return;

    setIsAnimating(true);
    try {
      await animatePathWithinWorld(activeWorld, nodesById, sourceNode.id, targetNode.id);
    } finally {
      setIsAnimating(false);
    }
  };

  const handleWorldSelect = async (targetWorldId: string) => {
    if (isAnimating || targetWorldId === activeWorldId) return;

    const currentWorldIndex = progressByWorld.findIndex((worldProgress) => worldProgress.world.id === activeWorldId);
    const targetWorldIndex = progressByWorld.findIndex((worldProgress) => worldProgress.world.id === targetWorldId);
    const targetWorldProgress = progressByWorld.find((worldProgress) => worldProgress.world.id === targetWorldId);
    const targetWorld = targetWorldProgress?.world;
    if (!targetWorld || !targetWorldProgress?.unlocked) return;

    if (!activeWorld) {
      setActiveWorldId(targetWorldId);
      return;
    }

    const entryNodeId = resolveWorldEntryNodeId(targetWorld);
    if (!entryNodeId) {
      setActiveWorldId(targetWorldId);
      return;
    }

    const targetPositionedNodes = getPositionedNodes(targetWorld);
    const targetNodesById = new Map(targetPositionedNodes.map((node) => [node.id, node] as const));
    const entryNode = targetNodesById.get(entryNodeId);
    if (!entryNode) {
      setActiveWorldId(targetWorldId);
      return;
    }

    setIsAnimating(true);
    try {
      const isMovingBackward =
        currentWorldIndex >= 0 &&
        targetWorldIndex >= 0 &&
        targetWorldIndex < currentWorldIndex;

      const exitNodeId = isMovingBackward
        ? resolveWorldEntryNodeId(activeWorld) ?? currentNodeId
        : resolveWorldExitNodeId(activeWorld) ?? currentNodeId;

      if (currentNodeId && exitNodeId) {
        await animatePathWithinWorld(activeWorld, nodesById, currentNodeId, exitNodeId, {
          savePositionAtEnd: false,
          selectAtEnd: false
        });
      }

      const exitNode = exitNodeId ? nodesById.get(exitNodeId) : null;
      if (exitNode) {
        await animateAvatarBetweenPoints(
          { x: exitNode.x, y: exitNode.y },
          { x: isMovingBackward ? -8 : 108, y: exitNode.y },
          420
        );
      }

      worldTransitionRef.current = { targetWorldId };
      setActiveWorldId(targetWorldId);
      setCurrentNodeId(entryNode.id);
      setSelectedNodeId(entryNode.id);
      setIsMobilePanelOpen(false);
      setAvatarPosition({ x: -8, y: entryNode.y });
      await nextFrame();
      await animateAvatarBetweenPoints(
        { x: -8, y: entryNode.y },
        { x: entryNode.x, y: entryNode.y },
        460
      );
      saveCampaignPosition(targetWorldId, entryNode.id);
    } finally {
      worldTransitionRef.current = null;
      setIsAnimating(false);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    const node = nodesById.get(nodeId);
    if (!node || isAnimating) return;
    const level = node.levelId ? levelsById[node.levelId] : null;
    setSelectedNodeId(node.id);
    setIsMobilePanelOpen(true);
    if (currentNodeId === node.id) {
      if (level) {
        navigate(`${APP_ROUTES.play}/${level.id}`);
      }
      return;
    }

    animateToNode(node);
  };

  useEffect(() => {
    if (!activeWorld || positionedNodes.length === 0 || isAnimating) {
      return;
    }

    if (autoTutorialWorldIdRef.current === activeWorld.id) {
      return;
    }

    if (hasSeenCampaignWorldTutorial(activeWorld.id)) {
      autoTutorialWorldIdRef.current = activeWorld.id;
      return;
    }

    autoTutorialWorldIdRef.current = activeWorld.id;
    window.setTimeout(() => {
      void startTutorial("campaign-world-basics").then((didStart) => {
        if (didStart) {
          markCampaignWorldTutorialSeen(activeWorld.id);
        }
      });
    }, 160);
  }, [activeWorld, isAnimating, positionedNodes.length, startTutorial]);

  if (error) {
    return (
      <Screen mode="player">
        <div className="community-shell campaign-shell">
          <ScreenHeader
            backLabel={t("menu.menuLabel")}
            backTo={APP_ROUTES.home}
            eyebrow="Campaña INF261"
            title="Estructuras de datos lineales"
            className="campaign-topbar"
          />
          <p className="error-banner">{error}</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen mode="player">
      <div className="community-shell campaign-shell campaign-thesis-shell">
        <ScreenHeader
          backLabel={t("menu.menuLabel")}
          backTo={APP_ROUTES.home}
          eyebrow="Campaña INF261"
          title="Estructuras de datos lineales"
          description={`Avanza por mundos secuenciales para practicar editor, pila, cola, lista e integración. Progreso total ${totalCompleted}/${totalLevels} niveles completados.`}
          className="campaign-topbar"
        />

        <section
          className="campaign-world-strip"
          aria-label="World progression"
          {...tutorialAnchorProps("campaign-world-strip")}
        >
          {progressByWorld.map((worldProgress, index) => {
            const isSelected = worldProgress.world.id === activeWorldId;
            return (
              <div key={worldProgress.world.id} className="campaign-world-strip-step">
                <button
                  type="button"
                  className={`campaign-world-strip-node${worldProgress.unlocked ? " unlocked" : " locked"}${isSelected ? " current" : ""}`}
                  onClick={() => void handleWorldSelect(worldProgress.world.id)}
                >
                  <b>World {index + 1}</b>
                  <span>{worldProgress.completed}/{worldProgress.total}</span>
                </button>
                {index < progressByWorld.length - 1 ? (
                  <span className="campaign-world-strip-connector" aria-hidden>→</span>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="campaign-world-layout">
          <article
            className={`campaign-map-shell${isAnimating ? " is-animating" : ""}`}
            {...tutorialAnchorProps("campaign-map-shell")}
          >
            {activeWorldProgress ? (
              <div className="campaign-world-materials">
                {activeWorldProgress.world.name} · {activeWorldProgress.completed}/{activeWorldProgress.total}
              </div>
            ) : null}

            {activeWorldProgress && !activeWorldProgress.unlocked ? (
              <div className="campaign-world-empty">
                <h3>Mundo bloqueado</h3>
                <p>Completa el mundo anterior para desbloquear este bloque.</p>
              </div>
            ) : positionedNodes.length > 0 ? (
              <>
                <svg className="campaign-map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  {activeWorld?.edges.map((edge) => {
                    const fromNode = nodesById.get(edge.from);
                    const toNode = nodesById.get(edge.to);
                    if (!fromNode || !toNode) return null;
                    const points =
                      fromNode.x === toNode.x || fromNode.y === toNode.y
                        ? `${fromNode.x},${fromNode.y} ${toNode.x},${toNode.y}`
                        : `${fromNode.x},${fromNode.y} ${toNode.x},${fromNode.y} ${toNode.x},${toNode.y}`;
                    return (
                      <polyline
                        key={`${edge.from}-${edge.to}`}
                        points={points}
                        className={`campaign-map-edge ${edge.type} is-open`}
                        fill="none"
                      />
                    );
                  })}
                </svg>

                {positionedNodes.map((node) => {
                  const completed = completedNodeIds.has(node.id);
                  const isCurrent = currentNodeId === node.id;
                  const isInvalid = Boolean(node.levelId) && !levelsById[node.levelId];
                  const isStartNode = activeWorld?.startNodeId === node.id;
                  const playableIndex = activeWorld?.nodes.filter(isPlayableNode).findIndex((candidate) => candidate.id === node.id) ?? -1;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`campaign-map-node unlocked${completed ? " completed" : ""}${isCurrent ? " current" : ""}${isInvalid ? " invalid" : ""}${isStartNode ? " start" : ""}`}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      onClick={() => handleNodeClick(node.id)}
                      disabled={isAnimating}
                    >
                      {isStartNode ? <span className="campaign-map-node-badge">INICIO</span> : null}
                      <span>{isPlayableNode(node) ? playableIndex + 1 : "→"}</span>
                    </button>
                  );
                })}

                <div
                  className="campaign-map-avatar"
                  style={{ left: `${avatarPosition.x}%`, top: `${avatarPosition.y}%` }}
                  aria-label="Player position"
                >
                  <span className="campaign-map-avatar-tag">YOU</span>
                  <span className="campaign-map-avatar-arrow">↓</span>
                  <span className="campaign-map-avatar-figure" aria-hidden>🧠</span>
                </div>
              </>
            ) : (
              <div className="campaign-world-empty">
                <h3>Mundo sin niveles</h3>
                <p>No hay nodos configurados para este mundo.</p>
              </div>
            )}
          </article>

          <aside
            className={`campaign-world-sidepanel${isMobilePanelOpen ? " open" : ""}`}
            {...tutorialAnchorProps("campaign-sidepanel")}
          >
            <button
              type="button"
              className="campaign-sidepanel-toggle"
              onClick={() => setIsMobilePanelOpen((current) => !current)}
            >
              {selectedNode?.titleOverride ?? selectedLevel?.title ?? activeWorld?.name ?? "Campaña"}
            </button>
            <div className="campaign-sidepanel-content">
              <section className="campaign-level-panel">
                {selectedNode && selectedLevel ? (
                  <>
                    <p className="eyebrow">Nodo seleccionado</p>
                    <h2>{selectedNode.titleOverride ?? selectedLevel.title}</h2>
                    <p>
                      {selectedNode.descriptionOverride ??
                        selectedLevel.metadata.description ??
                        "Sin descripción."}
                    </p>
                    <p className="campaign-next-milestone">
                      Introduce: {selectedLevel.teachingPlan?.introduces.join(", ") ?? "Concepto no declarado."}
                    </p>
                    <p className="campaign-level-meta">
                      Dificultad {formatDifficultyScore(selectedLevel.metadata.difficulty)} · {" "}
                      {completedNodeIds.has(selectedNode.id) ? "Completado" : "Pendiente"}
                    </p>
                    <div className="campaign-node-tags">
                      {selectedLevel.metadata.structuresUsed.map((structure) => (
                        <span key={`${selectedNode.id}-${structure}`} className="mini-tag">
                          {t(`structures.${structure}`)}
                        </span>
                      ))}
                    </div>
                    <Link className="menu-link campaign-play-link" to={`${APP_ROUTES.play}/${selectedLevel.id}`}>
                      {completedNodeIds.has(selectedNode.id) ? "Repetir nivel" : t("actions.play")}
                    </Link>
                  </>
                ) : selectedNode && isFirstWorldStartNode ? (
                  <>
                    <p className="eyebrow">Bienvenida</p>
                    <h2>Welcome to the campaign</h2>
                    <p>
                      Hey! Welcome to this campaign. You'll learn here the basics of this software and how to use it.
                    </p>
                    <p className="campaign-level-meta">
                      Click level 1 to get started. Then click "Play", or click the same level again, to start playing.
                    </p>
                  </>
                ) : selectedNode ? (
                  <>
                    <p className="eyebrow">Nodo seleccionado</p>
                    <h2>{selectedNode.titleOverride ?? "Punto de inicio"}</h2>
                    <p>
                      {selectedNode.descriptionOverride ??
                        "Este nodo marca la entrada al mundo. Muévete al siguiente nivel para continuar."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="eyebrow">Nodo seleccionado</p>
                    <h2>Selecciona un nodo</h2>
                    <p>Haz click en un nivel para mover el avatar y abrir sus detalles.</p>
                  </>
                )}
              </section>
            </div>
          </aside>
        </section>
      </div>
    </Screen>
  );
}
