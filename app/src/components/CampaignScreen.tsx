import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { formatDifficultyScore, renderDifficultyStars } from "../difficulty-display";
import { ScreenHeader } from "./ui/ScreenHeader";
import { tutorialAnchorProps } from "../features/tutorial/anchors";
import { getCampaignScreenCopy } from "../features/campaign/campaign-content";
import { useTutorial } from "../features/tutorial/TutorialProvider";
import {
  hasSeenTutorial,
  markTutorialSeen
} from "../features/tutorial/storage";
import {
  clearPendingCampaignCompletion,
  loadPendingCampaignCompletion
} from "../features/campaign/completion-flow";

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

interface WorldCelebrationState {
  completedWorldName: string;
  nextWorldName: string | null;
  concepts: string[];
  nextWorldId: string | null;
}

type PositionedNode = CampaignWorldDefinition["nodes"][number] & {
  x: number;
  y: number;
};

const CAMPAIGN_FIRST_VISIT_KEY = "visual-data-structures-campaign-first-visit-v1";
const CAMPAIGN_POSITION_KEY = "visual-data-structures-campaign-position-v2";
const CAMPAIGN_ACTIVE_WORLD_KEY = "visual-data-structures-campaign-active-world-v1";

const formatWorldName = (name: string): string => name.replace(/^W\d+\s*·\s*/i, "");
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

const loadActiveCampaignWorldId = (): string | null => {
  try {
    const stored = localStorage.getItem(CAMPAIGN_ACTIVE_WORLD_KEY);
    return stored && stored.trim().length > 0 ? stored : null;
  } catch {
    return null;
  }
};

const saveActiveCampaignWorldId = (worldId: string): void => {
  localStorage.setItem(CAMPAIGN_ACTIVE_WORLD_KEY, worldId);
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

const resolveWorldRightmostAvailablePlayableNodeId = (
  world: CampaignWorldDefinition,
  completedLevelIds: string[]
): string | null => {
  const playableNodes = world.nodes.filter(isPlayableNode);
  if (playableNodes.length === 0) {
    return null;
  }

  const completedLevelSet = new Set(completedLevelIds);
  const completedCount = playableNodes.filter(
    (node) => node.levelId && completedLevelSet.has(node.levelId)
  ).length;
  const availableCount = Math.min(playableNodes.length, Math.max(1, completedCount + 1));
  return playableNodes[availableCount - 1]?.id ?? playableNodes[0]?.id ?? null;
};

const getSelectableNodeIds = (
  world: CampaignWorldDefinition,
  completedLevelIds: string[]
): Set<string> => {
  const selectable = new Set<string>();
  const startNodeId = resolveWorldEntryNodeId(world);
  if (startNodeId) {
    selectable.add(startNodeId);
  }

  const playableNodes = world.nodes.filter(isPlayableNode);
  if (playableNodes.length === 0) {
    return selectable;
  }

  const completedLevelSet = new Set(completedLevelIds);
  const completedCount = playableNodes.filter(
    (node) => node.levelId && completedLevelSet.has(node.levelId)
  ).length;
  const lastUnlockedIndex = Math.min(playableNodes.length - 1, completedCount);

  for (let index = 0; index <= lastUnlockedIndex; index += 1) {
    const node = playableNodes[index];
    if (node) {
      selectable.add(node.id);
    }
  }

  return selectable;
};

const isPlayableNode = (node: CampaignWorldDefinition["nodes"][number]): boolean =>
  typeof node.levelId === "string" && node.levelId.length > 0;

const getWorldProgress = (
  worlds: CampaignWorldDefinition[],
  completedLevelIds: string[]
): WorldProgress[] => {
  const completedLevelSet = new Set(completedLevelIds);

  return worlds.map((world, index) => {
    const playableNodes = world.nodes.filter(isPlayableNode);
    const completed = playableNodes.filter((node) => node.levelId && completedLevelSet.has(node.levelId)).length;
    const total = playableNodes.length;
    const previousWorld = worlds[index - 1];
    const previousCompleted = previousWorld
      ? previousWorld.nodes.filter((node) => isPlayableNode(node) && node.levelId && completedLevelSet.has(node.levelId)).length
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
  const campaignCopy = getCampaignScreenCopy();
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
  const [worldCelebration, setWorldCelebration] = useState<WorldCelebrationState | null>(null);
  const hasHandledFirstVisitRef = useRef(false);
  const worldTransitionRef = useRef<{ targetWorldId: string } | null>(null);
  const hasAttemptedAutoTutorialRef = useRef(false);
  const pendingCompletionHandledRef = useRef<string | null>(null);

  const persistCurrentCampaignLocation = (worldId: string, nodeId: string) => {
    saveActiveCampaignWorldId(worldId);
    saveCampaignPosition(worldId, nodeId);
  };

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
        const storedWorldId = loadActiveCampaignWorldId();
        const initialWorldId =
          storedWorldId && loadedWorlds.some((world) => world.id === storedWorldId)
            ? storedWorldId
            : loadedWorlds[0]?.id ?? "";
        setActiveWorldId(initialWorldId);
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
    const fallbackWorldId = progressByWorld[0]?.world.id ?? "";
    setActiveWorldId(fallbackWorldId);
    if (fallbackWorldId) {
      saveActiveCampaignWorldId(fallbackWorldId);
    }
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
        .filter((node) => isPlayableNode(node) && node.levelId && completedLevels.has(node.levelId))
        .map((node) => node.id)
    );
  }, [activeWorld, completedLevelIds]);

  const selectableNodeIds = useMemo(
    () => (activeWorld ? getSelectableNodeIds(activeWorld, completedLevelIds) : new Set<string>()),
    [activeWorld, completedLevelIds]
  );

  const pendingCompletion = useMemo(() => loadPendingCampaignCompletion(), [activeWorldId, completedLevelIds]);

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
    persistCurrentCampaignLocation(activeWorld.id, currentNode.id);
  }, [activeWorld, nodesById]);

  useEffect(() => {
    if (!activeWorld || !currentNodeId || isAnimating || worldCelebration) {
      return;
    }

    const pending = pendingCompletion;
    if (!pending) {
      pendingCompletionHandledRef.current = null;
      return;
    }

    const pendingKey = `${pending.kind}:${pending.worldId}:${pending.completedNodeId}`;
    if (pendingCompletionHandledRef.current === pendingKey) {
      return;
    }

    if (pending.worldId !== activeWorld.id || currentNodeId !== pending.completedNodeId) {
      return;
    }

    pendingCompletionHandledRef.current = pendingKey;

    if (pending.kind === "advance-level") {
      const nextNode = nodesById.get(pending.nextNodeId);
      if (!nextNode) {
        clearPendingCampaignCompletion();
        return;
      }

      void (async () => {
        setIsAnimating(true);
        try {
          await animatePathWithinWorld(activeWorld, nodesById, pending.completedNodeId, pending.nextNodeId);
          clearPendingCampaignCompletion();
        } finally {
          setIsAnimating(false);
        }
      })();
      return;
    }

    const completedWorld = worlds.find((world) => world.id === pending.worldId) ?? activeWorld;
    const nextWorld = pending.nextWorldId
      ? worlds.find((world) => world.id === pending.nextWorldId) ?? null
      : null;
    const concepts = completedWorld.nodes
      .map((node) => node.levelId ? levelsById[node.levelId] : null)
      .flatMap((level) => level?.teachingPlan?.introduces ?? [])
      .map((concept) => concept.trim())
      .filter((concept) => concept.length > 0);

    setWorldCelebration({
      completedWorldName: formatWorldName(completedWorld.name),
      nextWorldName: nextWorld ? formatWorldName(nextWorld.name) : null,
      concepts: Array.from(new Set(concepts)).slice(0, 3),
      nextWorldId: pending.nextWorldId
    });
  }, [activeWorld, currentNodeId, isAnimating, levelsById, nodesById, pendingCompletion, worldCelebration, worlds]);

  useEffect(() => {
    if (!activeWorldId) return;
    saveActiveCampaignWorldId(activeWorldId);
  }, [activeWorldId]);

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
        persistCurrentCampaignLocation(world.id, targetNode.id);
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
      persistCurrentCampaignLocation(world.id, targetNode.id);
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

    const isMovingBackward =
      currentWorldIndex >= 0 &&
      targetWorldIndex >= 0 &&
      targetWorldIndex < currentWorldIndex;

    const arrivalNodeId = isMovingBackward
      ? resolveWorldRightmostAvailablePlayableNodeId(targetWorld, completedLevelIds) ?? resolveWorldEntryNodeId(targetWorld)
      : resolveWorldEntryNodeId(targetWorld);

    if (!arrivalNodeId) {
      setActiveWorldId(targetWorldId);
      return;
    }

    const targetPositionedNodes = getPositionedNodes(targetWorld);
    const targetNodesById = new Map(targetPositionedNodes.map((node) => [node.id, node] as const));
    const arrivalNode = targetNodesById.get(arrivalNodeId);
    if (!arrivalNode) {
      setActiveWorldId(targetWorldId);
      return;
    }

    setIsAnimating(true);
    try {
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
      setCurrentNodeId(arrivalNode.id);
      setSelectedNodeId(arrivalNode.id);
      setIsMobilePanelOpen(false);
      setAvatarPosition({ x: isMovingBackward ? 108 : -8, y: arrivalNode.y });
      await nextFrame();
      await animateAvatarBetweenPoints(
        { x: isMovingBackward ? 108 : -8, y: arrivalNode.y },
        { x: arrivalNode.x, y: arrivalNode.y },
        460
      );
      persistCurrentCampaignLocation(targetWorldId, arrivalNode.id);
    } finally {
      worldTransitionRef.current = null;
      setIsAnimating(false);
    }
  };

  const handleWorldCelebrationContinue = async () => {
    const nextWorldId = worldCelebration?.nextWorldId ?? null;
    setWorldCelebration(null);
    clearPendingCampaignCompletion();
    if (nextWorldId) {
      await handleWorldSelect(nextWorldId);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    const node = nodesById.get(nodeId);
    if (!node || isAnimating) return;
    if (!selectableNodeIds.has(node.id)) return;
    const level = node.levelId ? levelsById[node.levelId] : null;
    setSelectedNodeId(node.id);
    setIsMobilePanelOpen(true);
    if (currentNodeId === node.id) {
      if (level) {
        persistCurrentCampaignLocation(activeWorldId, node.id);
        navigate(`${APP_ROUTES.play}/${level.id}`, { state: { returnTo: APP_ROUTES.campaign } });
      }
      return;
    }

    animateToNode(node);
  };

  useEffect(() => {
    if (!activeWorld || positionedNodes.length === 0 || isAnimating) {
      return;
    }

    if (hasAttemptedAutoTutorialRef.current) {
      return;
    }

    hasAttemptedAutoTutorialRef.current = true;

    if (hasSeenTutorial("campaign-world-basics")) {
      return;
    }

    window.setTimeout(() => {
      void startTutorial("campaign-world-basics").then((didStart) => {
        if (didStart) {
          markTutorialSeen("campaign-world-basics");
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
            eyebrow={campaignCopy.eyebrow}
            title={campaignCopy.title}
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
          eyebrow={campaignCopy.eyebrow}
          title={campaignCopy.title}
          description={campaignCopy.description({ completed: totalCompleted, total: totalLevels })}
          className="campaign-topbar"
        />

        <section
          className="campaign-world-strip"
          aria-label={campaignCopy.worldStripAriaLabel}
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
                  disabled={isAnimating || worldCelebration !== null}
                >
                  <b>{campaignCopy.worldLabel(index + 1)}</b>
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
                {formatWorldName(activeWorldProgress.world.name)} · {activeWorldProgress.completed}/{activeWorldProgress.total}
              </div>
            ) : null}

            {activeWorldProgress && !activeWorldProgress.unlocked ? (
              <div className="campaign-world-empty">
                <h3>{campaignCopy.blockedWorldTitle}</h3>
                <p>{campaignCopy.blockedWorldBody}</p>
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
                  const isInvalid = typeof node.levelId === "string" && !levelsById[node.levelId];
                  const isStartNode = activeWorld?.startNodeId === node.id;
                  const isEntryNode = isStartNode && !isPlayableNode(node);
                  const isSelectable = selectableNodeIds.has(node.id);
                  const playableIndex = activeWorld?.nodes.filter(isPlayableNode).findIndex((candidate) => candidate.id === node.id) ?? -1;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`campaign-map-node${isSelectable ? " unlocked" : " locked"}${completed ? " completed" : ""}${isCurrent ? " current" : ""}${isInvalid ? " invalid" : ""}${isStartNode ? " start" : ""}${isEntryNode ? " entry" : ""}`}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      onClick={() => handleNodeClick(node.id)}
                      disabled={isAnimating || !isSelectable}
                    >
                      {isStartNode ? <span className="campaign-map-node-badge">{campaignCopy.startBadge}</span> : null}
                      {isPlayableNode(node) ? (
                        <span>{playableIndex + 1}</span>
                      ) : (
                        <span className="campaign-map-node-portal" aria-hidden>
                          <span className="campaign-map-node-portal-door" />
                          <span className="campaign-map-node-portal-glow" />
                        </span>
                      )}
                    </button>
                  );
                })}

                <div
                  className="campaign-map-avatar"
                  style={{ left: `${avatarPosition.x}%`, top: `${avatarPosition.y}%` }}
                  aria-label={campaignCopy.playerPositionAriaLabel}
                >
                  <span className="campaign-map-avatar-tag">{campaignCopy.playerTag}</span>
                  <span className="campaign-map-avatar-arrow">↓</span>
                  <span className="campaign-map-avatar-figure" aria-hidden>🧠</span>
                </div>
              </>
            ) : (
              <div className="campaign-world-empty">
                <h3>{campaignCopy.emptyWorldTitle}</h3>
                <p>{campaignCopy.emptyWorldBody}</p>
              </div>
            )}

            {worldCelebration ? (
              <div className="campaign-world-celebration" role="dialog" aria-modal="true">
                <div className="campaign-world-celebration-confetti" aria-hidden>
                  {Array.from({ length: 18 }).map((_, index) => (
                    <span
                      key={`confetti-${index}`}
                      className={`campaign-confetti-piece piece-${(index % 6) + 1}`}
                      style={
                        {
                          "--piece-left": `${8 + ((index * 5) % 82)}%`,
                          "--piece-delay": `${(index % 6) * 80}ms`,
                          "--piece-duration": `${1700 + (index % 5) * 120}ms`
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
                <div className="campaign-world-celebration-card">
                  <p className="eyebrow">{campaignCopy.worldCompleteEyebrow}</p>
                  <h2>{campaignCopy.worldCompleteTitle}</h2>
                  <p>
                    {worldCelebration.nextWorldId
                      ? campaignCopy.worldCompleteBody
                      : campaignCopy.worldCompleteFinalBody}
                  </p>
                  {worldCelebration.concepts.length > 0 ? (
                    <div className="campaign-world-celebration-summary">
                      <span className="campaign-world-celebration-label">
                        {campaignCopy.worldCompleteConceptLabel}
                      </span>
                      <div className="campaign-node-tags">
                        {worldCelebration.concepts.map((concept) => (
                          <span key={concept} className="mini-tag">{concept}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="campaign-world-celebration-footer">
                    <div>
                      <strong>{worldCelebration.completedWorldName}</strong>
                      {worldCelebration.nextWorldName ? (
                        <p>{campaignCopy.worldCompleteNextLabel}: {worldCelebration.nextWorldName}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="menu-link campaign-world-celebration-button"
                      onClick={() => void handleWorldCelebrationContinue()}
                    >
                      {campaignCopy.worldCompleteContinue}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </article>

          <aside
            className={`campaign-world-sidepanel${isMobilePanelOpen ? " open" : ""}${worldCelebration ? " is-disabled" : ""}`}
            {...tutorialAnchorProps("campaign-sidepanel")}
          >
            <button
              type="button"
              className="campaign-sidepanel-toggle"
              onClick={() => setIsMobilePanelOpen((current) => !current)}
            >
              {selectedNode?.titleOverride ?? selectedLevel?.title ?? (activeWorld ? formatWorldName(activeWorld.name) : null) ?? campaignCopy.panelFallbackTitle}
            </button>
            <div className="campaign-sidepanel-content">
              <section className="campaign-level-panel">
                {selectedNode && selectedLevel ? (
                  <>
                    <p className="eyebrow">{campaignCopy.selectedLevelEyebrow}</p>
                    <h2>{selectedNode.titleOverride ?? selectedLevel.title}</h2>
                    <p className="campaign-level-description">
                      {selectedNode.descriptionOverride ??
                        selectedLevel.metadata.description ??
                        campaignCopy.noDescription}
                    </p>
                    <div className="campaign-level-meta-row">
                      <span
                        className="campaign-level-meta-pill campaign-level-meta-pill--difficulty"
                        title={`${campaignCopy.metaDifficultyLabel} ${formatDifficultyScore(selectedLevel.metadata.difficulty)}`}
                        aria-label={`${campaignCopy.metaDifficultyLabel} ${formatDifficultyScore(selectedLevel.metadata.difficulty)}`}
                      >
                        <span>{campaignCopy.metaDifficultyLabel}:</span>
                        <span>{renderDifficultyStars(selectedLevel.metadata.difficulty)}</span>
                      </span>
                      {completedNodeIds.has(selectedNode.id) ? (
                        <span className="campaign-level-meta-pill">
                          {campaignCopy.completedLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="campaign-next-milestone">
                      <span className="campaign-next-milestone-label">{campaignCopy.introducesLabel}</span>
                      <p>{selectedLevel.teachingPlan?.introduces.join(", ") ?? campaignCopy.introducesFallback}</p>
                    </div>
                    <div className="campaign-node-tags">
                      {selectedLevel.metadata.structuresUsed.map((structure) => (
                        <span key={`${selectedNode.id}-${structure}`} className="mini-tag">
                          {t(`structures.${structure}`)}
                        </span>
                      ))}
                    </div>
                    <Link
                      className="menu-link campaign-play-link"
                      to={`${APP_ROUTES.play}/${selectedLevel.id}`}
                      state={{ returnTo: APP_ROUTES.campaign }}
                      onClick={() => {
                        if (activeWorldId && selectedNode) {
                          persistCurrentCampaignLocation(activeWorldId, selectedNode.id);
                        }
                      }}
                    >
                      {completedNodeIds.has(selectedNode.id) ? campaignCopy.replayLabel : t("actions.play")}
                    </Link>
                  </>
                ) : selectedNode && isFirstWorldStartNode ? (
                  <>
                    <p className="eyebrow">{campaignCopy.welcomeEyebrow}</p>
                    <h2>{campaignCopy.welcomeTitle}</h2>
                    <p className="campaign-level-description">{campaignCopy.welcomeBody}</p>
                    <p className="campaign-level-meta">{campaignCopy.welcomeMeta}</p>
                  </>
                ) : selectedNode ? (
                  <>
                    <p className="eyebrow">{campaignCopy.selectedNodeEyebrow}</p>
                    <h2>{selectedNode.titleOverride ?? campaignCopy.startNodeTitle}</h2>
                    <p className="campaign-level-description">
                      {selectedNode.descriptionOverride ??
                        campaignCopy.startNodeBody}
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
