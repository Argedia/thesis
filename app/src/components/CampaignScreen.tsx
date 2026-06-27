import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { LevelDefinition } from "@thesis/game-system";
import {
  JsonCampaignWorldRepository,
  JsonLevelRepository,
  LocalProgressRepository,
  type CampaignNode,
  type CampaignWorldDefinition
} from "@thesis/storage";
import { Screen } from "@thesis/ui-editor";
import { APP_ROUTES } from "../types/routes";

const levelRepository = new JsonLevelRepository();
const worldRepository = new JsonCampaignWorldRepository();
const progressRepository = new LocalProgressRepository();

const CAMPAIGN_POSITION_KEY = "visual-data-structures-campaign-position-v1";
const CASTLE_ART_URL = "castle.txt";

type CampaignViewMode = "hub" | "world" | "castle";

interface AvatarPosition {
  x: number;
  y: number;
}

interface PositionedNode extends CampaignNode {
  x: number;
  y: number;
}

interface WorldProgress {
  world: CampaignWorldDefinition;
  completed: number;
  total: number;
  required: number;
  unlocked: boolean;
}

const HUB_CASTLE_COORD = { x: 50, y: 50 };

const HUB_LAYOUT: Array<{ id: string; x: number; y: number }> = [
  { id: "w1", x: 30, y: 20 },
  { id: "w2", x: 50, y: 20 },
  { id: "w6", x: 30, y: 50 },
  { id: "w3", x: 70, y: 50 },
  { id: "w5", x: 30, y: 80 },
  { id: "w4", x: 50, y: 80 }
];

const HUB_EDGES: Array<[string, string]> = [
  ["w1", "w2"],
  ["w1", "w6"],
  ["w2", "w3"],
  ["w6", "w5"],
  ["w5", "w4"],
  ["w6", "w3"],
  ["w3", "w4"]
];

const easeInOut = (t: number): number => 0.5 - Math.cos(Math.PI * t) / 2;
const formatDifficultyScore = (difficulty: number): string => difficulty.toFixed(1);

const normalizeAsciiArt = (raw: string): string => {
  const lines = raw.replace(/\r/g, "").split("\n");
  while (lines.length > 0 && lines[0]?.trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") lines.pop();
  if (lines.length === 0) return "";

  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const match = line.match(/^(\s+)/);
      return match ? match[1].length : 0;
    });
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(minIndent).replace(/\s+$/g, "")).join("\n");
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

const getAdjacency = (world: CampaignWorldDefinition): Map<string, Set<string>> => {
  const adjacency = new Map<string, Set<string>>();
  world.nodes.forEach((node) => adjacency.set(node.id, new Set<string>()));
  world.edges.forEach((edge) => {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  });
  return adjacency;
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

const getOpenBranchGroups = (
  world: CampaignWorldDefinition,
  completedSet: Set<string>
): Set<string> => {
  const openGroups = new Set<string>();
  world.branchUnlockRules?.forEach((rule) => {
    const mode = rule.mode ?? "all";
    const isOpen =
      mode === "any"
        ? rule.requiresNodeIds.some((id) => completedSet.has(id))
        : rule.requiresNodeIds.every((id) => completedSet.has(id));
    if (isOpen) openGroups.add(rule.branchGroup);
  });
  return openGroups;
};

const getUnlockedNodes = (
  world: CampaignWorldDefinition,
  completedSet: Set<string>
): Set<string> => {
  if (world.nodes.length === 0 || !world.startNodeId) {
    return new Set<string>();
  }

  const unlocked = new Set<string>([world.startNodeId]);
  const adjacency = getAdjacency(world);
  const openBranchGroups = getOpenBranchGroups(world, completedSet);

  world.nodes.forEach((node) => {
    const completed = completedSet.has(node.id);
    const branchOpen = node.branchGroup ? openBranchGroups.has(node.branchGroup) : false;
    const connectedFromCompleted = [...(adjacency.get(node.id) ?? [])].some((neighbor) =>
      completedSet.has(neighbor)
    );
    if (completed || branchOpen || connectedFromCompleted) {
      unlocked.add(node.id);
    }
  });

  return unlocked;
};

const resolveCurrentNodeId = (
  world: CampaignWorldDefinition,
  completedSet: Set<string>,
  unlockedSet: Set<string>
): string | null => {
  if (world.nodes.length === 0 || !world.startNodeId) return null;

  const stored = loadCampaignPosition()[world.id];
  if (stored && unlockedSet.has(stored)) return stored;

  const completedNodes = world.nodes.filter((node) => completedSet.has(node.id));
  if (completedNodes.length > 0) {
    return completedNodes[completedNodes.length - 1]?.id ?? world.startNodeId;
  }

  return world.startNodeId;
};

const getRequiredCompletions = (world: CampaignWorldDefinition): number => {
  const configured = world.requiredCompletions ?? 5;
  if (world.nodes.length <= 0) return configured;
  return Math.min(configured, world.nodes.length);
};

const getWorldProgress = (
  worlds: CampaignWorldDefinition[],
  completedLevelIds: string[]
): WorldProgress[] => {
  const completedLevelSet = new Set(completedLevelIds);
  return worlds.map((world, index) => {
    const completed = world.nodes.filter((node) => completedLevelSet.has(node.levelId)).length;
    const total = world.nodes.length;
    const required = getRequiredCompletions(world);
    const unlocked =
      index === 0
        ? true
        : (() => {
            const previous = worlds[index - 1];
            const previousCompleted = previous.nodes.filter((node) =>
              completedLevelSet.has(node.levelId)
            ).length;
            const previousRequired = getRequiredCompletions(previous);
            return previousCompleted >= previousRequired;
          })();
    return { world, completed, total, required, unlocked };
  });
};

const getHubNodeCoords = (worldIndex: number): { x: number; y: number } => {
  const slot = HUB_LAYOUT[worldIndex];
  return slot ? { x: slot.x, y: slot.y } : { x: 50, y: 50 };
};

export function CampaignScreen() {
  const { t } = useTranslation();
  const [levelsById, setLevelsById] = useState<Record<string, LevelDefinition>>({});
  const [worlds, setWorlds] = useState<CampaignWorldDefinition[]>([]);
  const [castleArt, setCastleArt] = useState("");
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<CampaignViewMode>("hub");
  const [activeWorldId, setActiveWorldId] = useState<string>("");
  const [hubSelectedTargetId, setHubSelectedTargetId] = useState<string>("castle");
  const [hubAvatarPosition, setHubAvatarPosition] = useState<AvatarPosition>(HUB_CASTLE_COORD);
  const [isHubAnimating, setIsHubAnimating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [currentNodeId, setCurrentNodeId] = useState<string>("");
  const [avatarPosition, setAvatarPosition] = useState<AvatarPosition>({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [blockedNodeId, setBlockedNodeId] = useState<string>("");
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const blockedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [levels, progress, loadedWorlds, castleResponse] = await Promise.all([
          levelRepository.listLevels(),
          progressRepository.loadProgress(),
          worldRepository.listWorlds(),
          fetch(new URL(CASTLE_ART_URL, document.baseURI).toString()).catch(() => null)
        ]);

        const levelMap: Record<string, LevelDefinition> = {};
        levels.forEach((level) => {
          levelMap[level.id] = level;
        });

        setLevelsById(levelMap);
        setCompletedLevelIds(progress.completedLevelIds);
        setWorlds(loadedWorlds);
        setActiveWorldId(loadedWorlds[0]?.id ?? "");
        setCastleArt(
          castleResponse && castleResponse.ok
            ? normalizeAsciiArt(await castleResponse.text())
            : ""
        );
        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t("playSession.couldNotLoadCampaign"));
      }
    };
    void load();
  }, []);

  useEffect(
    () => () => {
      if (blockedTimeoutRef.current) {
        window.clearTimeout(blockedTimeoutRef.current);
      }
    },
    []
  );

  const progressByWorld = useMemo(
    () => getWorldProgress(worlds, completedLevelIds),
    [completedLevelIds, worlds]
  );

  const activeWorldProgress = useMemo(
    () => progressByWorld.find((progress) => progress.world.id === activeWorldId) ?? null,
    [activeWorldId, progressByWorld]
  );

  const activeWorld = activeWorldProgress?.world ?? null;
  const selectedHubWorldProgress = useMemo(() => {
    if (hubSelectedTargetId === "castle") return null;
    return (
      progressByWorld.find((worldProgress) => worldProgress.world.id === hubSelectedTargetId) ??
      null
    );
  }, [hubSelectedTargetId, progressByWorld]);

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
        .filter((node) => completedLevels.has(node.levelId))
        .map((node) => node.id)
    );
  }, [activeWorld, completedLevelIds]);

  const unlockedNodeIds = useMemo(() => {
    if (!activeWorld) return new Set<string>();
    return getUnlockedNodes(activeWorld, completedNodeIds);
  }, [activeWorld, completedNodeIds]);

  useEffect(() => {
    if (!activeWorld || activeWorld.nodes.length === 0) {
      setSelectedNodeId("");
      setCurrentNodeId("");
      setAvatarPosition({ x: 0, y: 0 });
      return;
    }
    const resolvedCurrent = resolveCurrentNodeId(activeWorld, completedNodeIds, unlockedNodeIds);
    if (!resolvedCurrent) return;

    const currentNode = nodesById.get(resolvedCurrent);
    if (!currentNode) return;

    setCurrentNodeId(currentNode.id);
    setSelectedNodeId(currentNode.id);
    setAvatarPosition({ x: currentNode.x, y: currentNode.y });
    saveCampaignPosition(activeWorld.id, currentNode.id);
  }, [activeWorld, completedNodeIds, nodesById, unlockedNodeIds]);

  useEffect(() => {
    if (!activeWorld) return;
    const missingLevels = activeWorld.nodes
      .map((node) => node.levelId)
      .filter((levelId) => !levelsById[levelId]);

    if (missingLevels.length > 0) {
      console.warn(
        `[campaign] Missing level ids in world "${activeWorld.id}": ${missingLevels.join(", ")}`
      );
    }
  }, [activeWorld, levelsById]);

  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;
  const selectedLevel = selectedNode ? levelsById[selectedNode.levelId] : null;

  const globalCompleted = useMemo(() => {
    const completedSet = new Set(completedLevelIds);
    return worlds.reduce(
      (count, world) => count + world.nodes.filter((node) => completedSet.has(node.levelId)).length,
      0
    );
  }, [completedLevelIds, worlds]);

  const globalTotal = useMemo(
    () => worlds.reduce((count, world) => count + world.nodes.length, 0),
    [worlds]
  );

  const globalProgressPercent = useMemo(() => {
    if (globalTotal <= 0) return 0;
    return Math.round((globalCompleted / globalTotal) * 100);
  }, [globalCompleted, globalTotal]);

  const castleRevealPercent = useMemo(() => {
    if (globalTotal <= 0) return 10;
    const raw = 10 + (globalCompleted / globalTotal) * 90;
    return Math.max(10, Math.min(100, raw));
  }, [globalCompleted, globalTotal]);

  const flashBlockedNode = (id: string) => {
    setBlockedNodeId(id);
    if (blockedTimeoutRef.current) {
      window.clearTimeout(blockedTimeoutRef.current);
    }
    blockedTimeoutRef.current = window.setTimeout(() => setBlockedNodeId(""), 280);
  };

  useEffect(() => {
    if (progressByWorld.length <= 0) return;
    if (
      hubSelectedTargetId &&
      (hubSelectedTargetId === "castle" ||
        progressByWorld.some((world) => world.world.id === hubSelectedTargetId))
    ) {
      return;
    }
    setHubSelectedTargetId("castle");
    setHubAvatarPosition(HUB_CASTLE_COORD);
  }, [hubSelectedTargetId, progressByWorld]);

  const animateToNode = (targetNode: PositionedNode) => {
    const sourceNode = nodesById.get(currentNodeId);
    if (!sourceNode || !activeWorld) return;

    const from = { x: sourceNode.x, y: sourceNode.y };
    const to = { x: targetNode.x, y: targetNode.y };
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const durationMs = Math.max(360, Math.min(980, distance * 18));
    const startAt = performance.now();

    setIsAnimating(true);
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

      setCurrentNodeId(targetNode.id);
      setSelectedNodeId(targetNode.id);
      setIsAnimating(false);
      saveCampaignPosition(activeWorld.id, targetNode.id);
    };

    window.requestAnimationFrame(step);
  };

  const openWorld = (worldId: string) => {
    const worldProgress = progressByWorld.find((progress) => progress.world.id === worldId);
    if (!worldProgress) return;
    if (!worldProgress.unlocked) {
      flashBlockedNode(worldId);
      return;
    }
    setActiveWorldId(worldId);
    setViewMode("world");
    setIsMobilePanelOpen(false);
    setBlockedNodeId("");
  };

  const animateHubAvatarTo = (to: AvatarPosition, onFinish: () => void) => {
    const from = { ...hubAvatarPosition };
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const durationMs = Math.max(320, Math.min(900, distance * 18));
    const startedAt = performance.now();
    setIsHubAnimating(true);

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = easeInOut(progress);
      setHubAvatarPosition({
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased
      });

      if (progress < 1) {
        window.requestAnimationFrame(step);
        return;
      }

      setIsHubAnimating(false);
      onFinish();
    };

    window.requestAnimationFrame(step);
  };

  const handleHubCastleClick = () => {
    if (isHubAnimating) return;
    animateHubAvatarTo(HUB_CASTLE_COORD, () => setHubSelectedTargetId("castle"));
  };

  const handleHubWorldClick = (worldId: string) => {
    if (isHubAnimating) return;
    const worldProgress = progressByWorld.find((progress) => progress.world.id === worldId);
    if (!worldProgress) return;
    if (!worldProgress.unlocked) {
      flashBlockedNode(worldId);
      return;
    }

    const index = progressByWorld.findIndex((progress) => progress.world.id === worldId);
    const to = getHubNodeCoords(index);
    animateHubAvatarTo(to, () => setHubSelectedTargetId(worldId));
  };

  const handleWorldNodeClick = (nodeId: string) => {
    const node = nodesById.get(nodeId);
    if (!node || isAnimating) return;

    setSelectedNodeId(nodeId);
    setIsMobilePanelOpen(true);

    const isUnlocked = unlockedNodeIds.has(node.id);
    const isLevelValid = Boolean(levelsById[node.levelId]);

    if (!isUnlocked || !isLevelValid) {
      flashBlockedNode(node.id);
      return;
    }

    if (currentNodeId !== node.id) {
      animateToNode(node);
    }
  };

  if (error) {
    return (
      <Screen mode="player">
        <div className="community-shell campaign-shell">
          <header className="topbar community-topbar campaign-topbar primary-screen-topbar">
            <Link className="back-link" to={APP_ROUTES.home}>
              {t("menu.menuLabel")}
            </Link>
          </header>
          <p className="error-banner">{error}</p>
        </div>
      </Screen>
    );
  }

  const selectedIsUnlocked = selectedNode ? unlockedNodeIds.has(selectedNode.id) : false;
  const selectedIsCurrent = selectedNode ? selectedNode.id === currentNodeId : false;
  const selectedIsValid = selectedNode ? Boolean(levelsById[selectedNode.levelId]) : false;
  const canPlaySelected = Boolean(
    selectedNode &&
      selectedLevel &&
      selectedIsUnlocked &&
      selectedIsValid &&
      !isAnimating &&
      (activeWorld?.nodes.length ?? 0) > 0
  );

  return (
    <Screen mode="player">
      <div className="community-shell campaign-shell campaign-world-shell">
        <header className="topbar community-topbar campaign-topbar primary-screen-topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            {t("menu.menuLabel")}
          </Link>
          <div className="campaign-hub-head">
            <p className="eyebrow">
              {viewMode === "hub"
                ? "Mapa de campaña"
                : activeWorld?.name ?? "Mundo"}
            </p>
            <h1>Reconstruye el castillo</h1>
            <p className="campaign-hub-objective">
              Completa niveles para reunir materiales y desbloquear mundos.
            </p>
            <div className="campaign-hub-progress">
              <span>{globalProgressPercent}%</span>
              <div
                className="campaign-hub-progress-bar"
                role="progressbar"
                aria-valuenow={globalProgressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <i style={{ width: `${globalProgressPercent}%` }} />
              </div>
            </div>
          </div>
        </header>

        {viewMode === "hub" ? (
          <section className="campaign-world-layout">
            <article className={`campaign-map-shell campaign-hub-map${isHubAnimating ? " is-animating" : ""}`}>
              <svg className="campaign-map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {HUB_EDGES.map(([from, to]) => {
                  const fromIndex = Number(from.slice(1)) - 1;
                  const toIndex = Number(to.slice(1)) - 1;
                  const a = getHubNodeCoords(fromIndex);
                  const b = getHubNodeCoords(toIndex);
                  const points =
                    a.x === b.x || a.y === b.y
                      ? `${a.x},${a.y} ${b.x},${b.y}`
                      : `${a.x},${a.y} ${b.x},${a.y} ${b.x},${b.y}`;
                  return (
                    <polyline
                      key={`${from}-${to}`}
                      points={points}
                      className="campaign-map-edge is-open"
                      fill="none"
                    />
                  );
                })}
              </svg>

              <button
                type="button"
                className={`campaign-hub-castle-core${hubSelectedTargetId === "castle" ? " current" : ""}`}
                onClick={handleHubCastleClick}
                disabled={isHubAnimating}
                aria-label="Castillo central"
              >
                <span>C</span>
              </button>

              {castleArt ? (
                <figure className="campaign-castle-wrap campaign-castle-wrap-hub" aria-hidden>
                  <pre
                    className="campaign-castle-art"
                    style={{ clipPath: `inset(${100 - castleRevealPercent}% 0 0 0)` }}
                  >
                    {castleArt}
                  </pre>
                </figure>
              ) : null}

              {progressByWorld.map((worldProgress, index) => {
                const coords = getHubNodeCoords(index);
                const isBlockedFlash = blockedNodeId === worldProgress.world.id;
                return (
                  <button
                    key={worldProgress.world.id}
                    type="button"
                    className={`campaign-map-node campaign-world-node${worldProgress.unlocked ? " unlocked" : " locked"}${hubSelectedTargetId === worldProgress.world.id ? " current" : ""}${isBlockedFlash ? " blocked" : ""}`}
                    style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                    onClick={() => handleHubWorldClick(worldProgress.world.id)}
                    disabled={isHubAnimating}
                  >
                    <span>{index + 1}</span>
                    <strong className="campaign-world-node-progress">
                      {worldProgress.completed}/{worldProgress.required}
                    </strong>
                  </button>
                );
              })}

              <div
                className="campaign-map-avatar"
                style={{ left: `${hubAvatarPosition.x}%`, top: `${hubAvatarPosition.y}%` }}
                aria-label="Player position"
              >
                🧠
              </div>
            </article>

            <aside className="campaign-world-sidepanel">
              <div className="campaign-sidepanel-content">
                <section className="campaign-panel-card">
                  {hubSelectedTargetId === "castle" ? (
                    <>
                      <p className="eyebrow">Nodo seleccionado</p>
                      <h2>Castillo central</h2>
                      <p>Aquí se muestra el estado actual de reconstrucción del castillo.</p>
                      <p className="campaign-next-milestone">
                        Progreso global {globalProgressPercent}%
                      </p>
                      <button
                        type="button"
                        className="menu-link campaign-play-link"
                        onClick={() => setViewMode("castle")}
                      >
                        Entrar al castillo
                      </button>
                    </>
                  ) : selectedHubWorldProgress ? (
                    <>
                      <p className="eyebrow">Mundo seleccionado</p>
                      <h2>{selectedHubWorldProgress.world.name}</h2>
                      <p>{selectedHubWorldProgress.world.hubGoal.objective}</p>
                      <p className="campaign-next-milestone">
                        Conseguidos {selectedHubWorldProgress.completed}/{selectedHubWorldProgress.required}
                      </p>
                      {selectedHubWorldProgress.unlocked ? (
                        <button
                          type="button"
                          className="menu-link campaign-play-link"
                          onClick={() => openWorld(selectedHubWorldProgress.world.id)}
                        >
                          Entrar al mundo
                        </button>
                      ) : (
                        <button className="menu-link campaign-play-link is-locked" type="button" disabled>
                          Mundo bloqueado
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="eyebrow">Nodo seleccionado</p>
                      <h2>Selecciona un destino</h2>
                      <p>Haz click en un mundo o en el castillo para mover el avatar.</p>
                    </>
                  )}
                </section>

                <section className="campaign-panel-card">
                  <p className="eyebrow">Progreso por mundo</p>
                  <h2>Materiales conseguidos</h2>
                  <div className="campaign-world-checklist">
                    {progressByWorld.map((worldProgress, index) => (
                      <div
                        key={worldProgress.world.id}
                        className={`campaign-world-check-item${worldProgress.unlocked ? " unlocked" : " locked"}`}
                      >
                        <b>W{index + 1}</b>
                        <span>{worldProgress.world.name}</span>
                        <strong>
                          Conseguidos {worldProgress.completed}/{worldProgress.required}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </aside>
          </section>
        ) : viewMode === "castle" ? (
          <section className="campaign-world-layout">
            <article className="campaign-map-shell campaign-castle-view">
              <button
                type="button"
                className="campaign-world-back"
                onClick={() => setViewMode("hub")}
              >
                ← Volver al mapa de mundos
              </button>
              {castleArt ? (
                <pre className="campaign-castle-art campaign-castle-art-full">
                  {castleArt}
                </pre>
              ) : (
                <div className="campaign-world-empty">
                  <h3>Castillo sin arte</h3>
                  <p>No se pudo cargar el archivo de castillo.</p>
                </div>
              )}
            </article>
            <aside className="campaign-world-sidepanel">
              <div className="campaign-sidepanel-content">
                <section className="campaign-panel-card">
                  <p className="eyebrow">Castillo</p>
                  <h2>Estado de reconstrucción</h2>
                  <p>Este panel muestra el arte ASCII completo en su estado actual.</p>
                  <p className="campaign-next-milestone">Progreso global {globalProgressPercent}%</p>
                </section>
              </div>
            </aside>
          </section>
        ) : (
          <section className="campaign-world-layout">
            <article className={`campaign-map-shell${isAnimating ? " is-animating" : ""}`}>
              <button
                type="button"
                className="campaign-world-back"
                onClick={() => setViewMode("hub")}
              >
                ← Volver al mapa de mundos
              </button>

              {activeWorldProgress ? (
                <div className="campaign-world-materials">
                  Conseguidos {activeWorldProgress.completed}/{activeWorldProgress.required}
                </div>
              ) : null}

              {(activeWorld?.nodes.length ?? 0) > 0 ? (
                <>
                  <svg className="campaign-map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                    {activeWorld?.edges.map((edge) => {
                      const fromNode = nodesById.get(edge.from);
                      const toNode = nodesById.get(edge.to);
                      if (!fromNode || !toNode) return null;
                      const edgeUnlocked = completedNodeIds.has(edge.from) || completedNodeIds.has(edge.to);
                      const points =
                        fromNode.x === toNode.x || fromNode.y === toNode.y
                          ? `${fromNode.x},${fromNode.y} ${toNode.x},${toNode.y}`
                          : `${fromNode.x},${fromNode.y} ${toNode.x},${fromNode.y} ${toNode.x},${toNode.y}`;
                      return (
                        <polyline
                          key={`${edge.from}-${edge.to}`}
                          points={points}
                          className={`campaign-map-edge ${edge.type}${edgeUnlocked ? " is-open" : ""}`}
                          fill="none"
                        />
                      );
                    })}
                  </svg>

                  {positionedNodes.map((node, index) => {
                    const unlocked = unlockedNodeIds.has(node.id);
                    const completed = completedNodeIds.has(node.id);
                    const isCurrent = currentNodeId === node.id;
                    const isBlockedFlash = blockedNodeId === node.id;
                    const isInvalid = !levelsById[node.levelId];
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`campaign-map-node${unlocked ? " unlocked" : " locked"}${completed ? " completed" : ""}${isCurrent ? " current" : ""}${isBlockedFlash ? " blocked" : ""}${isInvalid ? " invalid" : ""}`}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        onClick={() => handleWorldNodeClick(node.id)}
                        disabled={isAnimating}
                      >
                        <span>{index + 1}</span>
                      </button>
                    );
                  })}

                  <div
                    className="campaign-map-avatar"
                    style={{ left: `${avatarPosition.x}%`, top: `${avatarPosition.y}%` }}
                    aria-label="Player position"
                  >
                    🧠
                  </div>
                </>
              ) : (
                <div className="campaign-world-empty">
                  <h3>Mundo sin niveles aún</h3>
                  <p>La gamificación está lista. Falta cargar el contenido de niveles de este mundo.</p>
                </div>
              )}
            </article>

            <aside className={`campaign-world-sidepanel${isMobilePanelOpen ? " open" : ""}`}>
              <button
                type="button"
                className="campaign-sidepanel-toggle"
                onClick={() => setIsMobilePanelOpen((current) => !current)}
              >
                {selectedNode?.titleOverride ?? selectedLevel?.title ?? "Nodo"}
              </button>
              <div className="campaign-sidepanel-content">
                <section className="campaign-panel-card">
                  <p className="eyebrow">Hito del mundo</p>
                  <h2>{activeWorld?.hubGoal.title ?? "Sin hito"}</h2>
                  <p>{activeWorld?.hubGoal.objective ?? "Sin descripción."}</p>
                  {activeWorldProgress ? (
                    <p className="campaign-next-milestone">
                      Conseguidos {activeWorldProgress.completed}/{activeWorldProgress.required}
                    </p>
                  ) : null}
                </section>

                <section className="campaign-panel-card">
                  {selectedNode && selectedLevel ? (
                    <>
                      <p className="eyebrow">
                        Nodo {activeWorld?.nodes.findIndex((node) => node.id === selectedNode.id)! + 1}
                      </p>
                      <h2>{selectedNode.titleOverride ?? selectedLevel.title}</h2>
                      <p>
                        {selectedNode.descriptionOverride ??
                          selectedLevel.metadata.description ??
                          "Sin descripción."}
                      </p>
                      <div className="campaign-node-tags">
                        <span className="mini-tag">{formatDifficultyScore(selectedLevel.metadata.difficulty)}</span>
                        <span className="mini-tag">max {selectedLevel.constraints.maxSteps} pasos</span>
                        <span className="mini-tag">
                          {selectedIsCurrent ? "Actual" : selectedIsUnlocked ? "Desbloqueado" : "Bloqueado"}
                        </span>
                      </div>
                      {canPlaySelected ? (
                        <Link className="menu-link campaign-play-link" to={`${APP_ROUTES.play}/${selectedLevel.id}`}>
                          {completedNodeIds.has(selectedNode.id) ? "Repetir" : t("actions.play")}
                        </Link>
                      ) : (
                        <button className="menu-link campaign-play-link is-locked" type="button" disabled>
                          {selectedIsValid ? "Bloqueado" : "Nivel no válido"}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="eyebrow">Nodo</p>
                      <h2>Selecciona un nodo</h2>
                      <p>Elige un nodo desbloqueado para moverte y jugar.</p>
                    </>
                  )}
                </section>
              </div>
            </aside>
          </section>
        )}
      </div>
    </Screen>
  );
}
