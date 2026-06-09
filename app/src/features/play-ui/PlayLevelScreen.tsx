import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, DialogTrigger } from "react-aria-components";
import { LocalProgressRepository } from "@thesis/storage";
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
  projectProgramToEditorBlocks
} from "../program-editor-core";
import {
  createPlaySessionController,
  type PlaySessionController,
  type PlaySessionState
} from "../play-session";
import { APP_ROUTES } from "../../types/routes";
import { t as translate } from "../../i18n-helpers";
import { AppDialog, AppModal, AppPopover } from "../../components/ui/AppOverlay";
import { useDialogManager } from "./useDialogManager";
import { usePanelResize } from "./usePanelResize";
import { AppDialogs } from "./AppDialogs";
import { IdePanel } from "./IdePanel";
import { BoardPanel } from "./BoardPanel";
import { normalizeBlockLimits } from "../../play-editor/block-limits";
import { countEditorBlocks } from "../../play-editor/block-count";
import {
  recordLevelTeachingFailure,
  resetLevelTeachingFailures,
  hasSeenPlayLevelBasicsTutorial,
  markPlayLevelBasicsTutorialSeen
} from "../level-teaching/storage";
import { useTutorial } from "../tutorial/TutorialProvider";

const progressRepository = new LocalProgressRepository();

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

export function PlayLevelScreen() {
  const { t } = useTranslation();
  const { levelId } = useParams<{ levelId: string }>();
  const [sessionState, setSessionState] = useState<PlaySessionState>(initialSessionState);
  const [isShowingGoalPreview, setIsShowingGoalPreview] = useState(false);
  const [isLevelInfoOpen, setIsLevelInfoOpen] = useState(false);
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
  const pendingLevelStartTeachingRef = useRef(false);
  const { activeTutorialId, startTutorial } = useTutorial();

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
    if (levelId) void controller.loadLevel(levelId);
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
    const successStatus = "Success! You solved the level.";
    const previousStatus = previousStatusRef.current;
    const currentStatus = sessionState.status;

    if (previousStatus !== successStatus && currentStatus === successStatus) {
      void dialog.showAlert({
        title: t("messages.levelSolvedTitle"),
        message: t("messages.levelSolvedBody", { level: sessionState.level.title })
      });
    }

    previousStatusRef.current = currentStatus;
  }, [dialog, sessionState.level, sessionState.status, t]);

  useEffect(() => {
    if (!sessionState.level) {
      return;
    }

    const shouldShowFirstLevelWalkthrough = !hasSeenPlayLevelBasicsTutorial();
    const startMessage =
      sessionState.level.teaching?.messages.find((message) => message.trigger === "level_start") ?? null;

    if (shouldShowFirstLevelWalkthrough) {
      setActiveTeachingMessage(null);
      window.setTimeout(() => {
        void startTutorial("campaign-level-basics").then((didStart) => {
          if (!didStart) {
            setActiveTeachingMessage(startMessage);
            return;
          }

          markPlayLevelBasicsTutorialSeen();
          pendingLevelStartTeachingRef.current = startMessage !== null;
        });
      }, 120);
      previousOutcomeRef.current = null;
      return;
    }

    setActiveTeachingMessage(startMessage);
    previousOutcomeRef.current = null;
  }, [sessionState.level, startTutorial]);

  useEffect(() => {
    if (
      activeTutorialId === null &&
      pendingLevelStartTeachingRef.current &&
      sessionState.level
    ) {
      const startMessage =
        sessionState.level.teaching?.messages.find((message) => message.trigger === "level_start") ?? null;
      setActiveTeachingMessage(startMessage);
      pendingLevelStartTeachingRef.current = false;
    }
  }, [activeTutorialId, sessionState.level]);

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
    const reminder =
      sessionState.level.teaching?.messages.find((message) => message.trigger === trigger) ?? null;
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
            <Link className="back-link" to={APP_ROUTES.play}>{t("common.back")}</Link>
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
    Math.floor(maxBlocksByRoutine[sessionState.document.activeRoutineId] ?? 99)
  );
  const otherRoutineBlocks = Math.max(0, totalDocumentBlocks - visibleRoutineOperations);
  const effectiveActiveRoutineBlockLimit = allowAdditionalRoutines
    ? Math.max(0, maxBlocksGlobal - otherRoutineBlocks)
    : activeRoutineLimit;
  const effectiveDisplayBlockLimit = allowAdditionalRoutines ? maxBlocksGlobal : activeRoutineLimit;
  const disableCreateRoutine =
    !allowAdditionalRoutines || sessionState.document.routines.length >= maxRoutineCount;

  const permittedOperations = getPermittedOperationsFromPolicy(level.constraints.operationPolicy);

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

  return (
    <Screen mode="player">
      <div className="play-shell">
        <div className="level-info-dock">
          <DialogTrigger isOpen={isLevelInfoOpen} onOpenChange={setIsLevelInfoOpen}>
            <Button
              className="level-info-toggle"
              aria-label={isLevelInfoOpen ? t("common.hideLevelInfo") : t("common.showLevelInfo")}
            >
              i
            </Button>
            <AppPopover className="level-info-popover" placement="bottom end">
              <AppDialog aria-label={t("common.playMode")} className="level-info-panel">
                <div className="level-info-header">
                  <div className="level-info-title-group">
                    <p className="eyebrow">{t("common.playMode")}</p>
                    <h1>{level.title}</h1>
                  </div>
                  <Link className="back-link level-info-back" to={APP_ROUTES.play}>{t("common.levels")}</Link>
                </div>
                <div className="level-info-actions">
                  <span className="mini-tag">{t("common.goal")}</span>
                  <span className="mini-tag">{t("common.maxSteps")}: {level.constraints.maxSteps}</span>
                </div>
                <div className="level-info-actions">
                  {permittedOperations.map((op) => (
                    <span key={op} className="mini-tag">{t(`operations.${op}`)}</span>
                  ))}
                </div>
                <p className="level-info-description">
                  {level.metadata.description ?? t("common.solvePuzzle")}
                </p>
                {level.teaching ? (
                  <div className="app-dialog-actions">
                    <Button
                      className="app-dialog-button"
                      onPress={() => {
                        const startMessage =
                          level.teaching?.messages.find((message) => message.trigger === "level_start") ?? null;
                        setActiveTeachingMessage(startMessage);
                        setIsLevelInfoOpen(false);
                      }}
                    >
                      What this level introduces
                    </Button>
                  </div>
                ) : null}
              </AppDialog>
            </AppPopover>
          </DialogTrigger>
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
            outputMode={outputMode}
            visibleRoutineOperations={visibleRoutineOperations}
            dialog={dialog}
            status={sessionState.status}
            onToggleBreakpoint={(nodeId) => controller.toggleBreakpoint(nodeId)}
            onChange={(doc) => { setOutputMode("diagnostics"); controller.setDocument(doc); }}
            onStatus={(msg) => controller.setStatus(msg)}
            onSelectRoutine={(id) => controller.selectRoutine(id)}
            onRenameRoutine={handleRenameRoutine}
            onCreateRoutine={handleCreateRoutine}
            disableCreateRoutine={disableCreateRoutine}
            onRun={() => { ensureMainRoutineActive(); setOutputMode("runtime"); void controller.run().finally(openOutputForExecutionAttempt); }}
            onStep={() => { ensureMainRoutineActive(); setOutputMode("runtime"); void controller.step().finally(openOutputForExecutionAttempt); }}
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
            onPreviewPointerDown={() => {
              setIsShowingGoalPreview(true);
              void analyticsRepository.logEvent({
                sessionId: uiSessionIdRef.current,
                levelId: level.id,
                eventType: "goal_preview_started"
              });
            }}
            onPreviewPointerUp={() => {
              setIsShowingGoalPreview(false);
              void analyticsRepository.logEvent({
                sessionId: uiSessionIdRef.current,
                levelId: level.id,
                eventType: "goal_preview_ended"
              });
            }}
            onPreviewPointerLeave={() => setIsShowingGoalPreview(false)}
            onPreviewPointerCancel={() => setIsShowingGoalPreview(false)}
            onReset={() => controller.reset()}
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
