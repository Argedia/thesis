import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { JsonLevelRepository, LocalProgressRepository } from "@thesis/storage";
import { Panel, PuzzleBoard, Screen } from "@thesis/ui-editor";
import { compileEditorDocument, createEditorDocument } from "../program-editor-core";
import { PlayEditorSurface } from "../program-editor-dom";
import {
  createPlaySessionController,
  type PlaySessionController,
  type PlaySessionState
} from "../play-session";
import { APP_ROUTES } from "../../types/routes";
import { t as translate } from "../../i18n-helpers";

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
  const controllerRef = useRef<PlaySessionController | null>(null);
  const routineTabsRef = useRef<HTMLDivElement | null>(null);

  const controller = useMemo(() => {
    if (!controllerRef.current) {
      controllerRef.current = createPlaySessionController({
        levelRepository,
        progressRepository
      });
    }
    return controllerRef.current;
  }, []);

  useEffect(() => {
    const unsubscribe = controller.subscribe(setSessionState);
    return () => {
      unsubscribe();
      controller.dispose();
      controllerRef.current = null;
    };
  }, [controller]);

  useEffect(() => {
    if (!levelId) {
      return;
    }

    void controller.loadLevel(levelId);
  }, [controller, levelId]);

  useEffect(() => {
    const element = routineTabsRef.current;
    if (!element) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) {
        return;
      }
      event.preventDefault();
      element.scrollLeft += delta;
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [sessionState.document.routines.length]);

  if (!sessionState.level) {
    return (
      <Screen mode="player">
        <div className="settings-shell">
          <header className="topbar">
            <Link className="back-link" to={APP_ROUTES.play}>
              {t("common.back")}
            </Link>
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
  const visibleRoutine =
    sessionState.document.routines.find((routine) => routine.id === sessionState.document.activeRoutineId) ??
    sessionState.document.routines[0];
  const visibleRoutineOperations =
    (visibleRoutine && compiledProgram.routines[visibleRoutine.id]?.operations.length) ??
    compiledProgram.operations.length;

  const handleCreateRoutine = () => {
    const name = window.prompt(t("editor.routineName"), t("editor.routineDefault"));
    if (name === null) {
      return;
    }
    controller.createRoutine(name.trim() || t("editor.routineDefault"));
  };

  const handleRenameRoutine = (routineId: string, currentName: string) => {
    const nextName = window.prompt(t("editor.renameRoutine"), currentName);
    if (nextName === null) {
      return;
    }
    controller.renameRoutine(routineId, nextName.trim() || currentName);
  };

  return (
    <Screen mode="player">
      <div className="play-shell">
        <div className={`level-info-dock${isLevelInfoOpen ? " open" : ""}`}>
          <button
            type="button"
            className="level-info-toggle"
            aria-expanded={isLevelInfoOpen}
            aria-label={isLevelInfoOpen ? t("common.hideLevelInfo") : t("common.showLevelInfo")}
            onClick={() => setIsLevelInfoOpen((current) => !current)}
          >
            i
          </button>

          <div className="level-info-panel">
            <div className="level-info-header">
              <div className="level-info-title-group">
                <p className="eyebrow">{t("common.playMode")}</p>
                <h1>{level.title}</h1>
              </div>

              <Link className="back-link level-info-back" to={APP_ROUTES.play}>
                {t("common.levels")}
              </Link>
            </div>

            <div className="level-info-actions">
              <span className="mini-tag">{t("common.goal")}</span>
              <span className="mini-tag">
                {t("common.maxSteps")}: {level.constraints.maxSteps}
              </span>
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
              {level.constraints.allowedOperations.map((operation) => (
                <span key={operation} className="mini-tag">
                  {t(`operations.${operation}`)}
                </span>
              ))}
            </div>

            <p className="level-info-description">
              {level.metadata.description ?? t("common.solvePuzzle")}
            </p>
          </div>
        </div>

        <section className="play-dual-stage">
          <aside className="device-shell terminal-device">
            <div className="device-header terminal-header">
              <span className="device-label">{t("board.programConsole")}</span>
              <span className="device-time">
                {sessionState.runState === "running" ? t("state.run") : t("state.edit")}
              </span>
            </div>

            <div className="terminal-panel">
              <div className="ide-shell">
                <div className="ide-topbar">
                  <div ref={routineTabsRef} className="routine-strip ide-tabs">
                    {sessionState.document.routines.map((routine) => (
                      <button
                        key={routine.id}
                        type="button"
                        className={`routine-chip${
                          routine.id === sessionState.document.activeRoutineId ? " active" : ""
                        }`}
                        disabled={sessionState.runState === "running"}
                        onClick={() => controller.selectRoutine(routine.id)}
                        onDoubleClick={() => handleRenameRoutine(routine.id, routine.name)}
                      >
                        {routine.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="routine-chip routine-chip-add"
                      disabled={sessionState.runState === "running"}
                      onClick={handleCreateRoutine}
                    >
                      +
                    </button>
                  </div>

                  <div className="ide-run-actions">
                    <button type="button" onClick={() => void controller.run()}>
                      {t("actions.play")}
                    </button>
                    <button type="button" onClick={() => void controller.step()}>
                      {t("actions.step")}
                    </button>
                    <button type="button" onClick={() => controller.pause()}>
                      {t("actions.pause")}
                    </button>
                    <button type="button" onClick={() => controller.reset()}>
                      {t("actions.reset")}
                    </button>
                    <button type="button" onClick={() => controller.clearDocument()}>
                      {t("actions.clear")}
                    </button>
                  </div>
                </div>

                <div className="ide-editor-frame">
                  <PlayEditorSurface
                    structures={level.initialState}
                    allowedOperations={level.constraints.allowedOperations}
                    maxBlocks={level.constraints.maxSteps}
                    value={sessionState.document}
                    disabled={sessionState.runState === "running"}
                    highlightedNodeId={sessionState.highlightedNodeId}
                    breakpointNodeIds={sessionState.breakpointNodeIds}
                    onToggleBreakpoint={(nodeId) => controller.toggleBreakpoint(nodeId)}
                    onChange={(document) => controller.setDocument(document)}
                    onStatus={(message) => controller.setStatus(message)}
                  />
                </div>

                <div className="ide-output-panel">
                  <div className="ide-output-tabs">
                    <span className="ide-output-tab active">{t("board.output").toUpperCase()}</span>
                    <span className="ide-output-meta">
                      {t("board.blocksCount", {
                        count: visibleRoutineOperations,
                        max: level.constraints.maxSteps
                      })}
                    </span>
                  </div>
                  <div className="ide-output-body">
                    <div className="ide-output-line primary">{sessionState.status}</div>
                    {sessionState.events.length === 0 ? (
                      <div className="ide-output-line muted">
                        {t("board.runHint")}
                      </div>
                    ) : (
                      sessionState.events.slice(-6).map((event, index) => (
                        <div
                          key={`${event.stepId}-${event.type}-${index}`}
                          className="ide-output-line"
                        >
                          {event.type} · {event.structureId}
                          {event.value !== undefined ? ` · ${event.value}` : ""}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="device-shell board-device">
            <div className="device-header board-header">
              <span className="device-label">{t("board.playBoard")}</span>
              <span className="device-time">
                {sessionState.completedLevelIds.includes(level.id) ? t("state.done") : t("state.live")}
              </span>
            </div>

            <div className="board-surface">
              <div className="board-surface-grid" />

              <div className="board-content">
                <div className="board-visual-panel">
                  <PuzzleBoard
                    structures={isShowingGoalPreview ? level.goalState : sessionState.structures}
                    variables={isShowingGoalPreview ? [] : sessionState.variableSnapshots}
                  />
                </div>

                <div className="board-lower-panels">
                  <Panel title={t("board.executionFeed")} accent="#ffffff">
                    <div className="timeline-list">
                      {sessionState.events.length === 0 ? (
                        <p>{t("board.feedHint")}</p>
                      ) : null}
                      {sessionState.events.map((event, index) => (
                        <div
                          key={`${event.stepId}-${event.type}-${index}`}
                          className="timeline-entry"
                        >
                          {event.type} · {event.structureId}
                          {event.value !== undefined ? ` · ${event.value}` : ""}
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </Screen>
  );
}
