import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "react-aria-components";
import { ArrowLeft } from "lucide-react";
import { JsonCampaignWorldRepository, LocalProgressRepository } from "@thesis/storage";
import { Screen } from "@thesis/ui-editor";
import {
  getPermittedOperationsFromPolicy,
  type LevelTeachingMessage
} from "@thesis/game-system";
import { analyticsRepository, catalogLevelRepository } from "../../backend";
import {
  compileEditorDocument,
  createEditorDocument,
  projectDocumentToEditorBlocks,
  projectProgramToEditorBlocks,
  type EditorDocument
} from "../program-editor-core";
import {
  createPlaySessionController,
  type PlaySessionController,
  type PlaySessionState
} from "../play-session";
import { APP_ROUTES } from "../../types/routes";
import { t as translate } from "../../i18n-helpers";
import { AppDialog, AppModal } from "../../components/ui/AppOverlay";
import { useDialogManager } from "./useDialogManager";
import { usePanelResize } from "./usePanelResize";
import { AppDialogs } from "./AppDialogs";
import { IdePanel } from "./IdePanel";
import { BoardPanel } from "./BoardPanel";
import { normalizeBlockLimits } from "../../play-editor/block-limits";
import { countEditorBlocks } from "../../play-editor/block-count";
import {
  recordLevelTeachingFailure,
  resetLevelTeachingFailures
} from "../level-teaching/storage";
import { useTutorial } from "../tutorial/TutorialProvider";
import {
  hasSeenTutorial,
  markTutorialSeen
} from "../tutorial/storage";
import { tutorialAnchorProps } from "../tutorial/anchors";
import { savePendingCampaignCompletion } from "../campaign/completion-flow";

const progressRepository = new LocalProgressRepository();
const campaignWorldRepository = new JsonCampaignWorldRepository();
const GUIDED_W1_L1_LEVEL_ID = "campaign-w0-l1-first-contact";
const GUIDED_W1_L1_TUTORIAL_ID = "campaign-w1-l1-guided";
const GUIDED_W1_L2_LEVEL_ID = "campaign-w0-l2-step-and-reset";
const GUIDED_W1_L2_TUTORIAL_ID = "campaign-w1-l2-guided";
const GUIDED_W1_L3_LEVEL_ID = "campaign-w0-l3-read-before-run";
const GUIDED_W1_L3_TUTORIAL_ID = "campaign-w1-l3-guided";
const GUIDED_W2_L4_LEVEL_ID = "campaign-w2-2";
const GUIDED_W2_L4_TUTORIAL_ID = "campaign-w2-l4-guided";
const GUIDED_W3_L3_LEVEL_ID = "campaign-w3-3";
const GUIDED_W3_L3_TUTORIAL_ID = "campaign-w3-l3-guided";
const GUIDED_W4_L3_LEVEL_ID = "campaign-w4-2";
const GUIDED_W4_L3_TUTORIAL_ID = "campaign-w4-l3-guided";
const W1_L1_TUTORIAL_EVENTS = {
  structurePlaced: "campaign:w1-l1:structure-placed",
  operationSelected: "campaign:w1-l1:operation-selected",
  runPressed: "campaign:w1-l1:run-pressed",
  levelSolved: "campaign:w1-l1:level-solved"
} as const;
const W1_L2_TUTORIAL_EVENTS = {
  structuresReady: "campaign:w1-l2:structures-ready",
  operationsReady: "campaign:w1-l2:operations-ready",
  stepPressed: "campaign:w1-l2:step-pressed",
  resetPressed: "campaign:w1-l2:reset-pressed",
  runPressed: "campaign:w1-l2:run-pressed",
  levelSolved: "campaign:w1-l2:level-solved"
} as const;
const W1_L3_TUTORIAL_EVENTS = {
  structurePlaced: "campaign:w1-l3:structure-placed",
  enqueueSelected: "campaign:w1-l3:enqueue-selected",
  firstRunPressed: "campaign:w1-l3:first-run-pressed",
  expressionsOpened: "campaign:w1-l3:expressions-opened",
  literalPlaced: "campaign:w1-l3:literal-placed",
  finalRunPressed: "campaign:w1-l3:final-run-pressed",
  levelSolved: "campaign:w1-l3:level-solved"
} as const;
const W2_L4_TUTORIAL_EVENTS = {
  conditionalPlaced: "campaign:w2-l4:conditional-placed",
  comparisonReady: "campaign:w2-l4:comparison-ready",
  bodyReady: "campaign:w2-l4:body-ready"
} as const;
const W3_L3_TUTORIAL_EVENTS = {
  whilePlaced: "campaign:w3-l3:while-placed",
  conditionReady: "campaign:w3-l3:condition-ready",
  bodyReady: "campaign:w3-l3:body-ready"
} as const;
const W4_L3_TUTORIAL_EVENTS = {
  helperCreated: "campaign:w4-l3:helper-created",
  definitionPlaced: "campaign:w4-l3:definition-placed",
  helperLogicReady: "campaign:w4-l3:helper-logic-ready",
  mainCallReady: "campaign:w4-l3:main-call-ready"
} as const;
const W1_L1_FORCE_EXPANDED_SIDE_STEPS = new Set([
  "w1-l1-program-area",
  "w1-l1-palette-structure",
  "w1-l1-place-structure"
]);
const W1_L2_FORCE_EXPANDED_SIDE_STEPS = new Set([
  "w1-l2-place-two-stacks"
]);
const W1_L3_FORCE_EXPANDED_SIDE_STEPS = new Set([
  "w1-l3-place-queue"
]);
const W2_L4_FORCE_EXPANDED_SIDE_STEPS = new Set([
  "w2-l4-build-transfer"
]);
const W3_L3_FORCE_EXPANDED_SIDE_STEPS = new Set([
  "w3-l3-build-loop-body"
]);
const W4_L3_FORCE_EXPANDED_SIDE_STEPS = new Set([
  "w4-l3-build-helper-body",
  "w4-l3-call-helper-from-main"
]);

interface GuidedTutorialProgressState {
  levelId: string;
  structureGoalReached: boolean;
  operationGoalReached: boolean;
  valuePlaced: boolean;
  stepPressed: boolean;
  resetPressed: boolean;
  runPressed: boolean;
  extraRunPressed: boolean;
}

interface ActiveRoutineEditorMetrics {
  structureBlocks: number;
  structureBlocksWithOperation: number;
  operationCounts: Record<string, number>;
  valueBlocks: number;
}

interface DocumentTutorialMetrics {
  comparisonBlocks: number;
  conditionalBlocks: number;
  conditionalWithComparisonCondition: number;
  conditionalTransferReady: number;
  whileBlocks: number;
  whileWithComparisonCondition: number;
  whileTransferReady: number;
  helperRoutineCount: number;
  helperDefinitionCount: number;
  helperTransferReadyCount: number;
  mainRoutineCallCount: number;
}

const isStructureOperationBlock = (
  block: { kind: string; declaredTypeRef?: { kind?: string } | null }
): boolean =>
  block.kind === "structure" ||
  (block.kind === "var" && block.declaredTypeRef?.kind === "structure");

const initialSessionState = (): PlaySessionState => ({
  document: createEditorDocument(),
  level: null,
  structures: [],
  lockedBlockIds: [],
  variableSnapshots: [],
  heapSnapshots: [],
  events: [],
  runState: "idle",
  stepCursor: 0,
  breakpointNodeIds: [],
  highlightedNodeId: null,
  status: translate("common.loadingLevel"),
  lastEvaluationOutcome: null,
  completedLevelIds: [],
  compiledProgram: compileEditorDocument(createEditorDocument())
});

const createGuidedTutorialProgressState = (levelId = ""): GuidedTutorialProgressState => ({
  levelId,
  structureGoalReached: false,
  operationGoalReached: false,
  valuePlaced: false,
  stepPressed: false,
  resetPressed: false,
  runPressed: false,
  extraRunPressed: false
});

const getGuidedCampaignTutorialId = (levelId: string | null | undefined) => {
  switch (levelId) {
    case GUIDED_W1_L1_LEVEL_ID:
      return GUIDED_W1_L1_TUTORIAL_ID;
    case GUIDED_W1_L2_LEVEL_ID:
      return GUIDED_W1_L2_TUTORIAL_ID;
    case GUIDED_W1_L3_LEVEL_ID:
      return GUIDED_W1_L3_TUTORIAL_ID;
    case GUIDED_W2_L4_LEVEL_ID:
      return GUIDED_W2_L4_TUTORIAL_ID;
    case GUIDED_W3_L3_LEVEL_ID:
      return GUIDED_W3_L3_TUTORIAL_ID;
    case GUIDED_W4_L3_LEVEL_ID:
      return GUIDED_W4_L3_TUTORIAL_ID;
    default:
      return null;
  }
};

const getGuidedTutorialSolvedEvent = (levelId: string): string | null => {
  switch (levelId) {
    case GUIDED_W1_L1_LEVEL_ID:
      return W1_L1_TUTORIAL_EVENTS.levelSolved;
    case GUIDED_W1_L2_LEVEL_ID:
      return W1_L2_TUTORIAL_EVENTS.levelSolved;
    case GUIDED_W1_L3_LEVEL_ID:
      return W1_L3_TUTORIAL_EVENTS.levelSolved;
    default:
      return null;
  }
};

const getGuidedTutorialForceExpandedSteps = (levelId: string): Set<string> | null => {
  switch (levelId) {
    case GUIDED_W1_L1_LEVEL_ID:
      return W1_L1_FORCE_EXPANDED_SIDE_STEPS;
    case GUIDED_W1_L2_LEVEL_ID:
      return W1_L2_FORCE_EXPANDED_SIDE_STEPS;
    case GUIDED_W1_L3_LEVEL_ID:
      return W1_L3_FORCE_EXPANDED_SIDE_STEPS;
    case GUIDED_W2_L4_LEVEL_ID:
      return W2_L4_FORCE_EXPANDED_SIDE_STEPS;
    case GUIDED_W3_L3_LEVEL_ID:
      return W3_L3_FORCE_EXPANDED_SIDE_STEPS;
    case GUIDED_W4_L3_LEVEL_ID:
      return W4_L3_FORCE_EXPANDED_SIDE_STEPS;
    default:
      return null;
  }
};

const analyzeActiveRoutineEditorMetrics = (document: EditorDocument): ActiveRoutineEditorMetrics => {
  const activeRoutine = document.routines.find((routine) => routine.id === document.activeRoutineId);
  if (!activeRoutine) {
    return { structureBlocks: 0, structureBlocksWithOperation: 0, operationCounts: {}, valueBlocks: 0 };
  }

  const blocks = projectProgramToEditorBlocks(activeRoutine.program);
  const metrics: ActiveRoutineEditorMetrics = {
    structureBlocks: 0,
    structureBlocksWithOperation: 0,
    operationCounts: {},
    valueBlocks: 0
  };

  const visit = (block: (typeof blocks)[number] | null | undefined): void => {
    if (!block) {
      return;
    }

    if (isStructureOperationBlock(block)) {
      metrics.structureBlocks += 1;
      if (block.operation) {
        metrics.structureBlocksWithOperation += 1;
        metrics.operationCounts[block.operation] = (metrics.operationCounts[block.operation] ?? 0) + 1;
      }
    }

    if (block.kind === "value") {
      metrics.valueBlocks += 1;
    }

    if (block.inputBlock) {
      visit(block.inputBlock);
    }

    block.inputBlocks?.forEach(visit);
    block.bodyBlocks?.forEach(visit);
    block.alternateBodyBlocks?.forEach(visit);
  };

  blocks.forEach(visit);
  return metrics;
};

const isComparisonBlock = (block: { kind: string; expressionFamily?: string | null } | null | undefined): boolean =>
  block?.kind === "var_binary_operation" && block.expressionFamily === "comparison";

const collectOperationCounts = (blocks: Array<ReturnType<typeof projectProgramToEditorBlocks>[number]>): Record<string, number> => {
  const counts: Record<string, number> = {};

  const visit = (block: (typeof blocks)[number] | null | undefined): void => {
    if (!block) {
      return;
    }

    if (isStructureOperationBlock(block) && block.operation) {
      counts[block.operation] = (counts[block.operation] ?? 0) + 1;
    }

    if (block.inputBlock) {
      visit(block.inputBlock);
    }

    block.inputBlocks?.forEach(visit);
    block.bodyBlocks?.forEach(visit);
    block.alternateBodyBlocks?.forEach(visit);
  };

  blocks.forEach(visit);
  return counts;
};

const analyzeDocumentTutorialMetrics = (document: EditorDocument): DocumentTutorialMetrics => {
  const mainRoutine =
    document.routines.find((routine) => ["main", "principal"].includes(routine.name.trim().toLowerCase())) ??
    document.routines[0] ??
    null;

  const metrics: DocumentTutorialMetrics = {
    comparisonBlocks: 0,
    conditionalBlocks: 0,
    conditionalWithComparisonCondition: 0,
    conditionalTransferReady: 0,
    whileBlocks: 0,
    whileWithComparisonCondition: 0,
    whileTransferReady: 0,
    helperRoutineCount: 0,
    helperDefinitionCount: 0,
    helperTransferReadyCount: 0,
    mainRoutineCallCount: 0
  };

  document.routines.forEach((routine) => {
    const blocks = projectProgramToEditorBlocks(routine.program);
    const opCounts = collectOperationCounts(blocks);
    let routineHasFunctionDefinition = false;

    const visit = (block: (typeof blocks)[number] | null | undefined): void => {
      if (!block) {
        return;
      }

      if (isComparisonBlock(block)) {
        metrics.comparisonBlocks += 1;
      }

      if (block.kind === "conditional") {
        metrics.conditionalBlocks += 1;
        if (isComparisonBlock(block.inputBlock)) {
          metrics.conditionalWithComparisonCondition += 1;
        }

        const bodyOps = collectOperationCounts(block.bodyBlocks ?? []);
        if ((bodyOps.POP ?? 0) >= 1 && (bodyOps.PUSH ?? 0) >= 1) {
          metrics.conditionalTransferReady += 1;
        }
      }

      if (block.kind === "while") {
        metrics.whileBlocks += 1;
        if (isComparisonBlock(block.inputBlock)) {
          metrics.whileWithComparisonCondition += 1;
        }

        const bodyOps = collectOperationCounts(block.bodyBlocks ?? []);
        if ((bodyOps.DEQUEUE ?? 0) >= 1 && (bodyOps.ENQUEUE ?? 0) >= 1) {
          metrics.whileTransferReady += 1;
        }
      }

      if (block.kind === "function_definition") {
        routineHasFunctionDefinition = true;
        if (routine.id !== mainRoutine?.id) {
          metrics.helperDefinitionCount += 1;
        }
      }

      if (block.kind === "routine_call" && routine.id === mainRoutine?.id && block.routineCallMode !== "reference") {
        metrics.mainRoutineCallCount += 1;
      }

      if (block.inputBlock) {
        visit(block.inputBlock);
      }

      block.inputBlocks?.forEach(visit);
      block.bodyBlocks?.forEach(visit);
      block.alternateBodyBlocks?.forEach(visit);
    };

    blocks.forEach(visit);

    if (routine.id !== mainRoutine?.id) {
      metrics.helperRoutineCount += 1;
      if (routineHasFunctionDefinition && (opCounts.REMOVE_FIRST ?? 0) >= 1 && (opCounts.APPEND ?? 0) >= 1) {
        metrics.helperTransferReadyCount += 1;
      }
    }
  });

  return metrics;
};

export function PlayLevelScreen() {
  const { t } = useTranslation();
  const { levelId } = useParams<{ levelId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<PlaySessionState>(initialSessionState);
  const [isShowingGoalPreview, setIsShowingGoalPreview] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(true);
  const [activeTeachingMessage, setActiveTeachingMessage] = useState<LevelTeachingMessage | null>(null);
  const [outputMode, setOutputMode] = useState<"hidden" | "runtime" | "diagnostics">("diagnostics");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const controllerRef = useRef<PlaySessionController | null>(null);
  const routineTabsRef = useRef<HTMLDivElement | null>(null);
  const previousStatusRef = useRef<string>("");
  const previousOutcomeRef = useRef(sessionState.lastEvaluationOutcome);
  const uiSessionIdRef = useRef<string>(crypto.randomUUID());
  const tutorialEventStateRef = useRef<GuidedTutorialProgressState>(createGuidedTutorialProgressState());
  const levelWasCompletedOnEntryRef = useRef(false);
  const { activeTutorialId, activeStepId, startTutorial, notifyTutorialEvent } = useTutorial();
  const handleBack = (fallbackRoute: string) => {
    const returnTo =
      typeof (location.state as { returnTo?: unknown } | null)?.returnTo === "string"
        ? (location.state as { returnTo: string }).returnTo
        : null;
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate(fallbackRoute);
  };

  const dialog = useDialogManager();
  const isCompactLayout = viewportWidth <= 640;
  const { dualStageRef, dualStageStyle, isResizingPanels, startPanelResize } = usePanelResize(
    isCompactLayout,
    viewportWidth,
    "panel-split-ratio:play"
  );

  const controller = useMemo(() => {
    if (!controllerRef.current) {
      controllerRef.current = createPlaySessionController({
        levelRepository: catalogLevelRepository,
        progressRepository,
        analyticsRepository
      });
    }
    return controllerRef.current;
  }, []);

  useEffect(() => {
    const unsubscribe = controller.subscribe(setSessionState);
    return () => { unsubscribe(); controller.dispose(); controllerRef.current = null; };
  }, [controller]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (levelId) {
      void controller.loadLevel(levelId);
      setIsInstructionsOpen(true);
    }
  }, [controller, levelId]);

  useEffect(() => {
    const element = routineTabsRef.current;
    if (!element) return;
    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      element.scrollLeft += delta;
    };
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [sessionState.document.routines.length]);

  useEffect(() => {
    const isActive =
      sessionState.runState === "running" ||
      sessionState.runState === "paused" ||
      sessionState.events.length > 0;
    if (isActive && outputMode !== "diagnostics") setOutputMode("runtime");
  }, [sessionState.runState, sessionState.events.length, outputMode]);

  useEffect(() => {
    if (!sessionState.level) return;
    const successStatus = t("playSession.successSolved");
    const previousStatus = previousStatusRef.current;
    const currentStatus = sessionState.status;

    if (previousStatus !== successStatus && currentStatus === successStatus) {
      const guidedTutorialId = getGuidedCampaignTutorialId(sessionState.level.id);
      const solvedEventId = getGuidedTutorialSolvedEvent(sessionState.level.id);
      if (guidedTutorialId && solvedEventId && activeTutorialId === guidedTutorialId) {
        notifyTutorialEvent(solvedEventId);
      }
      const currentLevel = sessionState.level;
      void (async () => {
        let nextLevelId: string | null = null;
        const isCampaignLevel = currentLevel.id.startsWith("campaign-");
        if (isCampaignLevel) {
          try {
            const worlds = await campaignWorldRepository.listWorlds();
            const orderedCampaignLevelIds = worlds.flatMap((world) =>
              world.nodes
                .map((node) => node.levelId)
                .filter((levelId): levelId is string => typeof levelId === "string" && levelId.length > 0)
            );
            const idx = orderedCampaignLevelIds.findIndex((id) => id === currentLevel.id);
            nextLevelId = idx >= 0 ? orderedCampaignLevelIds[idx + 1] ?? null : null;

            if (!levelWasCompletedOnEntryRef.current) {
              const currentWorldIndex = worlds.findIndex((world) =>
                world.nodes.some((node) => node.levelId === currentLevel.id)
              );
              const currentWorld = currentWorldIndex >= 0 ? worlds[currentWorldIndex] ?? null : null;
              const nextWorld = currentWorldIndex >= 0 ? worlds[currentWorldIndex + 1] ?? null : null;
              const playableNodes = currentWorld?.nodes.filter(
                (node) => typeof node.levelId === "string" && node.levelId.length > 0
              ) ?? [];
              const currentNodeIndex = playableNodes.findIndex((node) => node.levelId === currentLevel.id);
              const currentNode = currentNodeIndex >= 0 ? playableNodes[currentNodeIndex] ?? null : null;
              const nextNode = currentNodeIndex >= 0 ? playableNodes[currentNodeIndex + 1] ?? null : null;

              if (currentWorld && currentNode) {
                if (nextNode) {
                  savePendingCampaignCompletion({
                    kind: "advance-level",
                    worldId: currentWorld.id,
                    completedNodeId: currentNode.id,
                    nextNodeId: nextNode.id
                  });
                } else {
                  savePendingCampaignCompletion({
                    kind: "world-complete",
                    worldId: currentWorld.id,
                    completedNodeId: currentNode.id,
                    nextWorldId: nextWorld?.id ?? null
                  });
                }
              }
            }
          } catch {
            // ignore — no next level
          }
        }

        if (isCampaignLevel) {
          await dialog.showAlert({
            title: t("messages.levelSolvedTitle"),
            message: t("messages.levelSolvedBody", { level: currentLevel.title }),
            confirmLabel: t("common.backToMap")
          });
          navigate(APP_ROUTES.campaign);
          return;
        }

        const action = await dialog.showLevelComplete({
          title: t("messages.levelSolvedTitle"),
          message: t("messages.levelSolvedBody", { level: currentLevel.title }),
          nextLevelId
        });
        if (action === "next" && nextLevelId) {
          navigate(`${APP_ROUTES.play}/${nextLevelId}`);
        } else {
          navigate(APP_ROUTES.campaign);
        }
      })();
    }

    previousStatusRef.current = currentStatus;
  }, [activeTutorialId, dialog, navigate, notifyTutorialEvent, sessionState.level, sessionState.status, t]);

  useEffect(() => {
    if (!sessionState.level) {
      return;
    }

    tutorialEventStateRef.current = createGuidedTutorialProgressState(sessionState.level.id);
    levelWasCompletedOnEntryRef.current = sessionState.completedLevelIds.includes(sessionState.level.id);

    const guidedTutorialId = getGuidedCampaignTutorialId(sessionState.level.id);
    const timeoutId = window.setTimeout(() => {
      if (guidedTutorialId) {
        void startTutorial(guidedTutorialId);
        return;
      }

      if (
        sessionState.level!.id.startsWith("campaign-") &&
        !hasSeenTutorial("campaign-level-basics")
      ) {
        void startTutorial("campaign-level-basics").then((started) => {
          if (started) {
            markTutorialSeen("campaign-level-basics");
          }
        });
      }
    }, 120);

    previousOutcomeRef.current = null;
    return () => window.clearTimeout(timeoutId);
  }, [sessionState.level, startTutorial]);

  useEffect(() => {
    const level = sessionState.level;
    if (!level) {
      return;
    }

    const guidedTutorialId = getGuidedCampaignTutorialId(level.id);
    if (!guidedTutorialId || activeTutorialId !== guidedTutorialId) {
      return;
    }

    const tutorialState = tutorialEventStateRef.current;
    if (tutorialState.levelId !== level.id) {
      tutorialEventStateRef.current = createGuidedTutorialProgressState(level.id);
    }

    const metrics = analyzeActiveRoutineEditorMetrics(sessionState.document);
    const documentMetrics = analyzeDocumentTutorialMetrics(sessionState.document);

    if (guidedTutorialId === GUIDED_W1_L1_TUTORIAL_ID) {
      if (metrics.structureBlocks >= 1 && !tutorialEventStateRef.current.structureGoalReached) {
        tutorialEventStateRef.current.structureGoalReached = true;
        notifyTutorialEvent(W1_L1_TUTORIAL_EVENTS.structurePlaced);
      }

      if (metrics.structureBlocksWithOperation >= 1 && !tutorialEventStateRef.current.operationGoalReached) {
        tutorialEventStateRef.current.operationGoalReached = true;
        notifyTutorialEvent(W1_L1_TUTORIAL_EVENTS.operationSelected);
      }
      return;
    }

    if (guidedTutorialId === GUIDED_W1_L2_TUTORIAL_ID) {
      const activeRoutineBlockCount = countEditorBlocks(projectDocumentToEditorBlocks(sessionState.document));

      if (activeRoutineBlockCount >= 2 && !tutorialEventStateRef.current.structureGoalReached) {
        tutorialEventStateRef.current.structureGoalReached = true;
        notifyTutorialEvent(W1_L2_TUTORIAL_EVENTS.structuresReady);
      }

      if ((metrics.operationCounts.POP ?? 0) >= 2 && !tutorialEventStateRef.current.operationGoalReached) {
        tutorialEventStateRef.current.operationGoalReached = true;
        notifyTutorialEvent(W1_L2_TUTORIAL_EVENTS.operationsReady);
      }
      return;
    }

    if (guidedTutorialId === GUIDED_W1_L3_TUTORIAL_ID) {
      if (metrics.structureBlocks >= 1 && !tutorialEventStateRef.current.structureGoalReached) {
        tutorialEventStateRef.current.structureGoalReached = true;
        notifyTutorialEvent(W1_L3_TUTORIAL_EVENTS.structurePlaced);
      }

      if ((metrics.operationCounts.ENQUEUE ?? 0) >= 1 && !tutorialEventStateRef.current.operationGoalReached) {
        tutorialEventStateRef.current.operationGoalReached = true;
        notifyTutorialEvent(W1_L3_TUTORIAL_EVENTS.enqueueSelected);
      }

      if (metrics.valueBlocks >= 1 && !tutorialEventStateRef.current.valuePlaced) {
        tutorialEventStateRef.current.valuePlaced = true;
        notifyTutorialEvent(W1_L3_TUTORIAL_EVENTS.literalPlaced);
      }
      return;
    }

    if (guidedTutorialId === GUIDED_W2_L4_TUTORIAL_ID) {
      if (documentMetrics.conditionalBlocks >= 1 && !tutorialEventStateRef.current.structureGoalReached) {
        tutorialEventStateRef.current.structureGoalReached = true;
        notifyTutorialEvent(W2_L4_TUTORIAL_EVENTS.conditionalPlaced);
      }

      if (documentMetrics.conditionalWithComparisonCondition >= 1 && !tutorialEventStateRef.current.operationGoalReached) {
        tutorialEventStateRef.current.operationGoalReached = true;
        notifyTutorialEvent(W2_L4_TUTORIAL_EVENTS.comparisonReady);
      }

      if (documentMetrics.conditionalTransferReady >= 1 && !tutorialEventStateRef.current.valuePlaced) {
        tutorialEventStateRef.current.valuePlaced = true;
        notifyTutorialEvent(W2_L4_TUTORIAL_EVENTS.bodyReady);
      }
      return;
    }

    if (guidedTutorialId === GUIDED_W3_L3_TUTORIAL_ID) {
      if (documentMetrics.whileBlocks >= 1 && !tutorialEventStateRef.current.structureGoalReached) {
        tutorialEventStateRef.current.structureGoalReached = true;
        notifyTutorialEvent(W3_L3_TUTORIAL_EVENTS.whilePlaced);
      }

      if (documentMetrics.whileWithComparisonCondition >= 1 && !tutorialEventStateRef.current.operationGoalReached) {
        tutorialEventStateRef.current.operationGoalReached = true;
        notifyTutorialEvent(W3_L3_TUTORIAL_EVENTS.conditionReady);
      }

      if (documentMetrics.whileTransferReady >= 1 && !tutorialEventStateRef.current.valuePlaced) {
        tutorialEventStateRef.current.valuePlaced = true;
        notifyTutorialEvent(W3_L3_TUTORIAL_EVENTS.bodyReady);
      }
      return;
    }

    if (guidedTutorialId === GUIDED_W4_L3_TUTORIAL_ID) {
      if (documentMetrics.helperRoutineCount >= 1 && !tutorialEventStateRef.current.structureGoalReached) {
        tutorialEventStateRef.current.structureGoalReached = true;
        notifyTutorialEvent(W4_L3_TUTORIAL_EVENTS.helperCreated);
      }

      if (documentMetrics.helperDefinitionCount >= 1 && !tutorialEventStateRef.current.operationGoalReached) {
        tutorialEventStateRef.current.operationGoalReached = true;
        notifyTutorialEvent(W4_L3_TUTORIAL_EVENTS.definitionPlaced);
      }

      if (documentMetrics.helperTransferReadyCount >= 1 && !tutorialEventStateRef.current.valuePlaced) {
        tutorialEventStateRef.current.valuePlaced = true;
        notifyTutorialEvent(W4_L3_TUTORIAL_EVENTS.helperLogicReady);
      }

      if (documentMetrics.mainRoutineCallCount >= 1 && !tutorialEventStateRef.current.runPressed) {
        tutorialEventStateRef.current.runPressed = true;
        notifyTutorialEvent(W4_L3_TUTORIAL_EVENTS.mainCallReady);
      }
    }
  }, [activeTutorialId, notifyTutorialEvent, sessionState.document, sessionState.level]);

  useEffect(() => {
    const level = sessionState.level;
    if (!level || level.id !== GUIDED_W1_L2_LEVEL_ID) {
      return;
    }

    if (activeTutorialId !== GUIDED_W1_L2_TUTORIAL_ID || activeStepId !== "w1-l2-step-once") {
      return;
    }

    if (tutorialEventStateRef.current.stepPressed) {
      return;
    }

    if (sessionState.stepCursor > 0 || sessionState.events.length > 0) {
      tutorialEventStateRef.current.stepPressed = true;
      notifyTutorialEvent(W1_L2_TUTORIAL_EVENTS.stepPressed);
    }
  }, [
    activeStepId,
    activeTutorialId,
    notifyTutorialEvent,
    sessionState.events.length,
    sessionState.level,
    sessionState.stepCursor
  ]);

  useEffect(() => {
    const level = sessionState.level;
    if (!level || level.id !== GUIDED_W1_L3_LEVEL_ID) {
      return;
    }

    if (activeTutorialId !== GUIDED_W1_L3_TUTORIAL_ID || activeStepId !== "w1-l3-left-palette") {
      return;
    }

    let frameId = 0;
    const detectLiteral = () => {
      const literalAnchor = document.querySelector('[data-tutorial-anchor="editor-palette-base-literal"]');
      if (literalAnchor) {
        notifyTutorialEvent(W1_L3_TUTORIAL_EVENTS.expressionsOpened);
        return;
      }
      frameId = window.requestAnimationFrame(detectLiteral);
    };

    frameId = window.requestAnimationFrame(detectLiteral);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeStepId, activeTutorialId, notifyTutorialEvent, sessionState.level]);

  useEffect(() => {
    if (!sessionState.level) {
      return;
    }

    const nextOutcome = sessionState.lastEvaluationOutcome;
    if (!nextOutcome || previousOutcomeRef.current === nextOutcome) {
      previousOutcomeRef.current = nextOutcome;
      return;
    }

    previousOutcomeRef.current = nextOutcome;

    if (nextOutcome === "success") {
      resetLevelTeachingFailures(sessionState.level.id);
      return;
    }

    if (
      nextOutcome !== "goal_mismatch" &&
      nextOutcome !== "missing_required_ops" &&
      nextOutcome !== "step_limit" &&
      nextOutcome !== "runtime_error"
    ) {
      return;
    }

    const failureCount = recordLevelTeachingFailure(sessionState.level.id);
    const trigger = failureCount <= 1 ? "first_failure" : "repeated_failure";
    const levelTeaching = sessionState.level.teaching ?? sessionState.level.teachingPlan;
    const reminder =
      levelTeaching?.messages.find((message) => message.trigger === trigger) ?? null;
    if (reminder) {
      setActiveTeachingMessage(reminder);
    }
  }, [sessionState.lastEvaluationOutcome, sessionState.level]);

  const visibleRoutineOperations = useMemo(
    () => countEditorBlocks(projectDocumentToEditorBlocks(sessionState.document)),
    [sessionState.document]
  );
  const totalDocumentBlocks = useMemo(
    () =>
      sessionState.document.routines.reduce(
        (acc, routine) => acc + countEditorBlocks(projectProgramToEditorBlocks(routine.program)),
        0
      ),
    [sessionState.document]
  );

  if (!sessionState.level) {
    return (
      <Screen mode="player">
        <div className="settings-shell">
          <header className="topbar">
            <button
              type="button"
              className="back-link back-link--icon"
              onClick={() => handleBack(APP_ROUTES.play)}
              aria-label={t("common.back")}
              title={t("common.back")}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <div>
              <p className="eyebrow">{t("common.playMode")}</p>
              <h1>{t("common.loadingLevel")}</h1>
            </div>
          </header>
        </div>
      </Screen>
    );
  }

  const { level, compiledProgram } = sessionState;
  const effectiveBlockLimits = normalizeBlockLimits({
    blockLimits: level.constraints.blockLimits,
    forbiddenBlocks: level.constraints.forbiddenBlocks,
    defaultLimit: Number.MAX_SAFE_INTEGER
  });
  const activeRoutineCompiled =
    compiledProgram.routines[sessionState.document.activeRoutineId] ?? compiledProgram;
  const allowAdditionalRoutines = level.constraints.allowAdditionalRoutines ?? true;
  const maxRoutineCount = Math.max(1, Math.floor(level.constraints.maxRoutineCount ?? 8));
  const maxBlocksGlobal = Math.max(
    0,
    Math.floor(level.constraints.maxBlocksGlobal ?? level.constraints.maxSteps)
  );
  const maxBlocksByRoutine = level.constraints.maxBlocksByRoutine ?? {};
  const activeRoutineLimit = Math.max(
    0,
    Math.floor(maxBlocksByRoutine[sessionState.document.activeRoutineId] ?? maxBlocksGlobal)
  );
  const otherRoutineBlocks = Math.max(0, totalDocumentBlocks - visibleRoutineOperations);
  const effectiveActiveRoutineBlockLimit = allowAdditionalRoutines
    ? Math.max(0, maxBlocksGlobal - otherRoutineBlocks)
    : activeRoutineLimit;
  const effectiveDisplayBlockLimit = effectiveActiveRoutineBlockLimit;
  const disableCreateRoutine =
    !allowAdditionalRoutines || sessionState.document.routines.length >= maxRoutineCount;

  const permittedOperations = getPermittedOperationsFromPolicy(level.constraints.operationPolicy);
  const guidedForceExpandedSteps = getGuidedTutorialForceExpandedSteps(level.id);
  const forceSidePaletteExpanded =
    activeTutorialId === getGuidedCampaignTutorialId(level.id) &&
    activeStepId !== null &&
    guidedForceExpandedSteps?.has(activeStepId) === true;

  const translateDiagnostic = (diagnostic: string): string => {
    const mapped: Record<string, string | undefined> = {
      function_type_conflict: t("messages.functionTypeConflict"),
      return_in_type_routine: t("messages.returnInTypeRoutine"),
      unknown_type: t("messages.unknownType"),
      unknown_type_field: t("messages.unknownTypeField"),
      type_mismatch_assign: t("messages.typeMismatchAssign"),
      type_mismatch_field_assign: t("messages.typeMismatchFieldAssign"),
      type_mismatch_expect_arg: t("messages.typeMismatchExpectArg")
    };
    return mapped[diagnostic] ?? diagnostic;
  };

  const openOutputForExecutionAttempt = () => {
    const state = controller.getState();
    const compiled = state.compiledProgram.routines[state.document.activeRoutineId] ?? state.compiledProgram;
    setOutputMode(compiled.isComplete ? "runtime" : "diagnostics");
  };

  const ensureMainRoutineActive = (): boolean => {
    const state = controller.getState();
    const activeId = state.document.activeRoutineId;
    const activeCompiled = state.compiledProgram.routines[activeId];
    if (!activeCompiled?.signature.isFunction) return false;
    const mainRoutine = state.document.routines.find(
      (r) => !(state.compiledProgram.routines[r.id]?.signature.isFunction)
    );
    if (mainRoutine && mainRoutine.id !== activeId) {
      controller.selectRoutine(mainRoutine.id);
    }
    return true;
  };

  const handleCreateRoutine = async () => {
    if (disableCreateRoutine) {
      controller.setStatus(
        allowAdditionalRoutines
          ? `Script limit reached (${maxRoutineCount}).`
          : "This level does not allow creating more scripts."
      );
      return;
    }
    const name = await dialog.requestTextInput({
      title: t("editor.routineName"),
      initialValue: t("editor.routineDefault"),
      validate: (v) => (v.trim() ? null : t("messages.valueEmpty"))
    });
    if (name !== null) controller.createRoutine(name.trim() || t("editor.routineDefault"));
  };

  const handleRenameRoutine = async (routineId: string, currentName: string) => {
    const nextName = await dialog.requestTextInput({
      title: t("editor.renameRoutine"),
      initialValue: currentName,
      validate: (v) => (v.trim() ? null : t("messages.valueEmpty"))
    });
    if (nextName !== null) controller.renameRoutine(routineId, nextName.trim() || currentName);
  };

  const handleRun = () => {
    ensureMainRoutineActive();
    setOutputMode("runtime");

    const guidedTutorialId = getGuidedCampaignTutorialId(level.id);
    if (activeTutorialId === guidedTutorialId) {
      if (guidedTutorialId === GUIDED_W1_L1_TUTORIAL_ID && !tutorialEventStateRef.current.runPressed) {
        tutorialEventStateRef.current.runPressed = true;
        notifyTutorialEvent(W1_L1_TUTORIAL_EVENTS.runPressed);
      }

      if (guidedTutorialId === GUIDED_W1_L2_TUTORIAL_ID && !tutorialEventStateRef.current.runPressed) {
        tutorialEventStateRef.current.runPressed = true;
        notifyTutorialEvent(W1_L2_TUTORIAL_EVENTS.runPressed);
      }

      if (guidedTutorialId === GUIDED_W1_L3_TUTORIAL_ID) {
        if (!tutorialEventStateRef.current.valuePlaced && !tutorialEventStateRef.current.runPressed) {
          tutorialEventStateRef.current.runPressed = true;
          notifyTutorialEvent(W1_L3_TUTORIAL_EVENTS.firstRunPressed);
        } else if (tutorialEventStateRef.current.valuePlaced && !tutorialEventStateRef.current.extraRunPressed) {
          tutorialEventStateRef.current.extraRunPressed = true;
          notifyTutorialEvent(W1_L3_TUTORIAL_EVENTS.finalRunPressed);
        }
      }
    }

    void controller.run().finally(openOutputForExecutionAttempt);
  };

  const handleStep = () => {
    ensureMainRoutineActive();
    setOutputMode("runtime");

    const guidedTutorialId = getGuidedCampaignTutorialId(level.id);
    if (
      guidedTutorialId === GUIDED_W1_L2_TUTORIAL_ID &&
      activeTutorialId === guidedTutorialId &&
      !tutorialEventStateRef.current.stepPressed
    ) {
      tutorialEventStateRef.current.stepPressed = true;
      notifyTutorialEvent(W1_L2_TUTORIAL_EVENTS.stepPressed);
    }

    void controller.step().finally(openOutputForExecutionAttempt);
  };

  const handleReset = () => {
    controller.reset();

    const guidedTutorialId = getGuidedCampaignTutorialId(level.id);
    if (
      guidedTutorialId === GUIDED_W1_L2_TUTORIAL_ID &&
      activeTutorialId === guidedTutorialId &&
      !tutorialEventStateRef.current.resetPressed
    ) {
      tutorialEventStateRef.current.resetPressed = true;
      notifyTutorialEvent(W1_L2_TUTORIAL_EVENTS.resetPressed);
    }
  };

  return (
    <Screen mode="player">
      <div className="play-shell">
        <div className="topbar primary-screen-topbar play-level-topbar">
          <div className="play-level-topbar-left">
            <button
              type="button"
              className="back-link back-link--icon"
              onClick={() => handleBack(APP_ROUTES.campaign)}
              aria-label={t("common.levels")}
              title={t("common.levels")}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <div className="play-level-title-group">
              <p className="eyebrow">{level.id.startsWith("campaign-") ? t("menu.campaign") : t("common.playMode")}</p>
              <h1>{level.title}</h1>
            </div>
          </div>
          {(() => {
            const levelTeaching = level.teaching ?? level.teachingPlan;
            const startMessage = levelTeaching?.messages.find((m) => m.trigger === "level_start");
            if (!startMessage) return null;
            return (
              <div
                className={`play-level-instructions${isInstructionsOpen ? "" : " is-collapsed"}`}
                {...tutorialAnchorProps("play-level-description")}
              >
                <button
                  type="button"
                  className="play-level-instructions-toggle"
                  onClick={() => setIsInstructionsOpen((v) => !v)}
                  aria-label={isInstructionsOpen ? t("editor.collapseInstructions") : t("editor.expandInstructions")}
                >
                  {isInstructionsOpen ? "▸" : "▸"}
                </button>
                {isInstructionsOpen ? (
                  <>
                    <p className="play-level-instructions-title">{startMessage.title}</p>
                    <p className="play-level-instructions-body">{startMessage.body}</p>
                  </>
                ) : (
                  <p className="play-level-instructions-title">{startMessage.title}</p>
                )}
              </div>
            );
          })()}
        </div>

        <AppModal
          isOpen={activeTeachingMessage !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setActiveTeachingMessage(null);
            }
          }}
        >
          {activeTeachingMessage ? (
            <AppDialog
              aria-label={activeTeachingMessage.title}
              title={activeTeachingMessage.title}
            >
              <p className="app-dialog-message">{activeTeachingMessage.body}</p>
              {activeTeachingMessage.concepts?.length ? (
                <div className="level-teaching-concepts">
                  {activeTeachingMessage.concepts.map((concept) => (
                    <span key={concept} className="mini-tag">{concept}</span>
                  ))}
                </div>
              ) : null}
              <div className="app-dialog-actions">
                <Button className="app-dialog-button" onPress={() => setActiveTeachingMessage(null)}>
                  Continue
                </Button>
              </div>
            </AppDialog>
          ) : null}
        </AppModal>

        <section
          ref={dualStageRef}
          className={`play-dual-stage${isResizingPanels ? " is-resizing" : ""}`}
          style={dualStageStyle}
        >
          <IdePanel
            document={sessionState.document}
            activeRoutineCompiled={activeRoutineCompiled}
            runState={sessionState.runState}
            highlightedNodeId={sessionState.highlightedNodeId}
            breakpointNodeIds={sessionState.breakpointNodeIds}
            events={sessionState.events}
            structures={level.initialState}
            lockedBlockIds={sessionState.lockedBlockIds}
            allowedOperations={permittedOperations}
            blockLimits={effectiveBlockLimits}
            maxSteps={level.constraints.maxSteps}
            maxBlocksForActiveRoutine={effectiveActiveRoutineBlockLimit}
            maxBlocksForDisplay={effectiveDisplayBlockLimit}
            hideOutputBlocksCounter={effectiveDisplayBlockLimit >= 99}
            outputMode={outputMode}
            visibleRoutineOperations={visibleRoutineOperations}
            forceSidePaletteExpanded={forceSidePaletteExpanded}
            dialog={dialog}
            status={sessionState.status}
            onToggleBreakpoint={(nodeId) => controller.toggleBreakpoint(nodeId)}
            onChange={(doc) => { setOutputMode("diagnostics"); controller.setDocument(doc); }}
            onStatus={(msg) => controller.setStatus(msg)}
            onSelectRoutine={(id) => controller.selectRoutine(id)}
            onRenameRoutine={handleRenameRoutine}
            onCreateRoutine={handleCreateRoutine}
            disableCreateRoutine={disableCreateRoutine}
            onRun={handleRun}
            onStep={handleStep}
            onPause={() => controller.pause()}
            onClear={() => controller.clearDocument()}
            translateDiagnostic={translateDiagnostic}
          />

          {!isCompactLayout ? (
            <div
              className="play-stage-divider"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={startPanelResize}
            />
          ) : null}

          <BoardPanel
            levelId={level.id}
            isCompleted={sessionState.completedLevelIds.includes(level.id)}
            isShowingGoalPreview={isShowingGoalPreview}
            onTogglePreview={() => {
              const next = !isShowingGoalPreview;
              setIsShowingGoalPreview(next);
              void analyticsRepository.logEvent({
                sessionId: uiSessionIdRef.current,
                levelId: level.id,
                eventType: next ? "goal_preview_started" : "goal_preview_ended"
              });
            }}
            onReset={handleReset}
            isRunning={sessionState.runState === "running"}
            structures={sessionState.structures}
            goalState={level.goalState}
            variableSnapshots={sessionState.variableSnapshots}
            heapSnapshots={sessionState.heapSnapshots}
            events={sessionState.events}
          />
        </section>

        <AppDialogs dialog={dialog} />
      </div>
    </Screen>
  );
}
