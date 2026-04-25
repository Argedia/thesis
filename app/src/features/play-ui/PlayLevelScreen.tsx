import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, DialogTrigger } from "react-aria-components";
import { JsonLevelRepository, LocalProgressRepository } from "@thesis/storage";
import { Screen } from "@thesis/ui-editor";
import { compileEditorDocument, createEditorDocument } from "../program-editor-core";
import {
  createPlaySessionController,
  type PlaySessionController,
  type PlaySessionState
} from "../play-session";
import { APP_ROUTES } from "../../types/routes";
import { t as translate } from "../../i18n-helpers";
import { AppPopover, AppDialog } from "../../components/ui/AppOverlay";
import { useDialogManager } from "./useDialogManager";
import { usePanelResize } from "./usePanelResize";
import { AppDialogs } from "./AppDialogs";
import { IdePanel } from "./IdePanel";
import { BoardPanel } from "./BoardPanel";

const levelRepository = new JsonLevelRepository();
const progressRepository = new LocalProgressRepository();

const initialSessionState = (): PlaySessionState => ({
  document: createEditorDocument(),
  level: null,
  structures: [],
  variableSnapshots: [],
  events: [],
  runState: "idle",
  stepCursor: 0,
  breakpointNodeIds: [],
  highlightedNodeId: null,
  status: translate("common.loadingLevel"),
  completedLevelIds: [],
  compiledProgram: compileEditorDocument(createEditorDocument())
});

export function PlayLevelScreen() {
  const { t } = useTranslation();
  const { levelId } = useParams<{ levelId: string }>();
  const [sessionState, setSessionState] = useState<PlaySessionState>(initialSessionState);
  const [isShowingGoalPreview, setIsShowingGoalPreview] = useState(false);
  const [isLevelInfoOpen, setIsLevelInfoOpen] = useState(false);
  const [outputMode, setOutputMode] = useState<"hidden" | "runtime" | "diagnostics">("hidden");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const controllerRef = useRef<PlaySessionController | null>(null);
  const routineTabsRef = useRef<HTMLDivElement | null>(null);

  const dialog = useDialogManager();
  const isCompactLayout = viewportWidth <= 640;
  const { dualStageRef, dualStageStyle, isResizingPanels, startPanelResize } = usePanelResize(
    isCompactLayout,
    viewportWidth
  );

  const controller = useMemo(() => {
    if (!controllerRef.current) {
      controllerRef.current = createPlaySessionController({ levelRepository, progressRepository });
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
  const activeRoutineCompiled =
    compiledProgram.routines[sessionState.document.activeRoutineId] ?? compiledProgram;

  const visibleRoutine =
    sessionState.document.routines.find((r) => r.id === sessionState.document.activeRoutineId) ??
    sessionState.document.routines[0];
  const visibleRoutineOperations =
    (visibleRoutine && compiledProgram.routines[visibleRoutine.id]?.operations.length) ??
    compiledProgram.operations.length;

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

  const handleCreateRoutine = async () => {
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
                  <button
                    type="button"
                    className="mini-action"
                    onPointerDown={() => setIsShowingGoalPreview(true)}
                    onPointerUp={() => setIsShowingGoalPreview(false)}
                    onPointerLeave={() => setIsShowingGoalPreview(false)}
                    onPointerCancel={() => setIsShowingGoalPreview(false)}
                  >
                    {t("common.previewResult")}
                  </button>
                </div>
                <div className="level-info-actions">
                  {level.constraints.allowedOperations.map((op) => (
                    <span key={op} className="mini-tag">{t(`operations.${op}`)}</span>
                  ))}
                </div>
                <p className="level-info-description">
                  {level.metadata.description ?? t("common.solvePuzzle")}
                </p>
              </AppDialog>
            </AppPopover>
          </DialogTrigger>
        </div>

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
            allowedOperations={level.constraints.allowedOperations}
            maxSteps={level.constraints.maxSteps}
            outputMode={outputMode}
            visibleRoutineOperations={visibleRoutineOperations}
            dialog={dialog}
            status={sessionState.status}
            onToggleBreakpoint={(nodeId) => controller.toggleBreakpoint(nodeId)}
            onChange={(doc) => { setOutputMode("hidden"); controller.setDocument(doc); }}
            onStatus={(msg) => controller.setStatus(msg)}
            onSelectRoutine={(id) => controller.selectRoutine(id)}
            onRenameRoutine={handleRenameRoutine}
            onCreateRoutine={handleCreateRoutine}
            onRun={() => { setOutputMode("runtime"); void controller.run().finally(openOutputForExecutionAttempt); }}
            onStep={() => { setOutputMode("runtime"); void controller.step().finally(openOutputForExecutionAttempt); }}
            onPause={() => controller.pause()}
            onReset={() => controller.reset()}
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
            structures={sessionState.structures}
            goalState={level.goalState}
            variableSnapshots={sessionState.variableSnapshots}
            events={sessionState.events}
          />
        </section>

        <AppDialogs dialog={dialog} />
      </div>
    </Screen>
  );
}
