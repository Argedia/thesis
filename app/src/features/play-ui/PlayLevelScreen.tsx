import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, DialogTrigger, Input, Label, TextField, Tooltip, TooltipTrigger } from "react-aria-components";
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
import { AppDialog, AppModal, AppPopover } from "../../components/ui/AppOverlay";

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
  const [dialogValue, setDialogValue] = useState("");
  const [dialogSecondaryValue, setDialogSecondaryValue] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const [leftPaneWidth, setLeftPaneWidth] = useState<number | null>(null);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const dualStageRef = useRef<HTMLElement | null>(null);
  const controllerRef = useRef<PlaySessionController | null>(null);
  const routineTabsRef = useRef<HTMLDivElement | null>(null);

  const [dialogState, setDialogState] = useState<
    | null
    | {
        kind: "text";
        title: string;
        initialValue?: string;
        validate?: (value: string) => string | null;
        resolve: (value: string | null) => void;
      }
    | {
        kind: "alert";
        title: string;
        message: string;
        resolve: () => void;
      }
    | {
        kind: "select";
        title: string;
        options: Array<{ value: string; label: string }>;
        initialValue?: string;
        resolve: (value: string | null) => void;
      }
    | {
        kind: "declaration";
        title: string;
        nameTitle: string;
        typeTitle: string;
        options: Array<{ value: string; label: string }>;
        initialName?: string;
        initialTypeValue?: string;
        resolve: (value: { name: string; typeValue: string } | null) => void;
      }
  >(null);

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
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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

  const isCompactLayout = viewportWidth <= 640;

  const clampLeftPaneWidth = (requestedWidth: number, containerWidth: number): number => {
    const splitterWidth = 8;
    const minPaneWidth = 360;
    const maxPaneWidth = Math.max(
      minPaneWidth,
      containerWidth - minPaneWidth - splitterWidth
    );
    return Math.min(Math.max(requestedWidth, minPaneWidth), maxPaneWidth);
  };

  useEffect(() => {
    if (isCompactLayout) {
      return;
    }

    const host = dualStageRef.current;
    if (!host) {
      return;
    }

    const containerWidth = host.getBoundingClientRect().width;
    const ideal = Math.round(containerWidth * 0.46);
    setLeftPaneWidth((current) =>
      clampLeftPaneWidth(current ?? ideal, containerWidth)
    );
  }, [isCompactLayout, viewportWidth]);

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

  const startPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isCompactLayout || !dualStageRef.current) {
      return;
    }

    const host = dualStageRef.current;
    const hostRect = host.getBoundingClientRect();
    const terminalPanel = host.querySelector(".terminal-device") as HTMLElement | null;
    const initialWidth =
      leftPaneWidth ?? terminalPanel?.getBoundingClientRect().width ?? hostRect.width * 0.46;
    const startX = event.clientX;

    setIsResizingPanels(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setLeftPaneWidth(
        clampLeftPaneWidth(initialWidth + delta, hostRect.width)
      );
    };

    const stopResize = () => {
      setIsResizingPanels(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  };
  const isOutputVisible =
    sessionState.runState === "running" ||
    sessionState.runState === "paused" ||
    sessionState.events.length > 0;
  const dualStageStyle =
    !isCompactLayout && leftPaneWidth
      ? { gridTemplateColumns: `${leftPaneWidth}px 8px minmax(0, 1fr)` }
      : undefined;

  const visibleRoutine =
    sessionState.document.routines.find((routine) => routine.id === sessionState.document.activeRoutineId) ??
    sessionState.document.routines[0];
  const visibleRoutineOperations =
    (visibleRoutine && compiledProgram.routines[visibleRoutine.id]?.operations.length) ??
    compiledProgram.operations.length;

  const closeDialog = () => {
    setDialogState(null);
    setDialogValue("");
    setDialogSecondaryValue("");
    setDialogError("");
  };

  const dismissDialog = () => {
    if (!dialogState) {
      return;
    }

    if (dialogState.kind === "alert") {
      dialogState.resolve();
    } else {
      dialogState.resolve(null);
    }
    closeDialog();
  };

  const requestTextInput = (options: {
    title: string;
    initialValue?: string;
    validate?: (value: string) => string | null;
  }) =>
    new Promise<string | null>((resolve) => {
      setDialogValue(options.initialValue ?? "");
      setDialogError("");
      setDialogState({
        kind: "text",
        ...options,
        resolve
      });
    });

  const requestSelectInput = (options: {
    title: string;
    initialValue?: string;
    options: Array<{ value: string; label: string }>;
  }) =>
    new Promise<string | null>((resolve) => {
      setDialogValue(options.initialValue ?? options.options[0]?.value ?? "");
      setDialogSecondaryValue("");
      setDialogError("");
      setDialogState({
        kind: "select",
        ...options,
        resolve
      });
    });

  const requestDeclarationInput = (options: {
    title: string;
    nameTitle: string;
    typeTitle: string;
    initialName?: string;
    initialTypeValue?: string;
    options: Array<{ value: string; label: string }>;
  }) =>
    new Promise<{ name: string; typeValue: string } | null>((resolve) => {
      setDialogValue(options.initialName ?? "");
      setDialogSecondaryValue(options.initialTypeValue ?? options.options[0]?.value ?? "");
      setDialogError("");
      setDialogState({
        kind: "declaration",
        ...options,
        resolve
      });
    });

  const showAlert = (options: { title?: string; message: string }) =>
    new Promise<void>((resolve) => {
      setDialogValue("");
      setDialogError("");
      setDialogState({
        kind: "alert",
        title: options.title ?? t("common.notice"),
        message: options.message,
        resolve
      });
    });

  const handleDialogSubmit = () => {
    if (!dialogState) {
      return;
    }

    if (dialogState.kind === "alert") {
      dialogState.resolve();
      closeDialog();
      return;
    }

    if (dialogState.kind === "select") {
      if (!dialogValue) {
        setDialogError(t("messages.valueEmpty"));
        return;
      }
      dialogState.resolve(dialogValue);
      closeDialog();
      return;
    }

    if (dialogState.kind === "declaration") {
      if (!dialogValue.trim()) {
        setDialogError(t("messages.variableNameEmpty"));
        return;
      }
      if (!dialogSecondaryValue) {
        setDialogError(t("messages.valueEmpty"));
        return;
      }
      dialogState.resolve({
        name: dialogValue.trim(),
        typeValue: dialogSecondaryValue
      });
      closeDialog();
      return;
    }

    const nextError = dialogState.validate?.(dialogValue) ?? null;
    if (nextError) {
      setDialogError(nextError);
      return;
    }

    dialogState.resolve(dialogValue);
    closeDialog();
  };

  const handleCreateRoutine = async () => {
    const name = await requestTextInput({
      title: t("editor.routineName"),
      initialValue: t("editor.routineDefault"),
      validate: (value) => (value.trim() ? null : t("messages.valueEmpty"))
    });
    if (name === null) {
      return;
    }
    controller.createRoutine(name.trim() || t("editor.routineDefault"));
  };

  const handleRenameRoutine = async (routineId: string, currentName: string) => {
    const nextName = await requestTextInput({
      title: t("editor.renameRoutine"),
      initialValue: currentName,
      validate: (value) => (value.trim() ? null : t("messages.valueEmpty"))
    });
    if (nextName === null) {
      return;
    }
    controller.renameRoutine(routineId, nextName.trim() || currentName);
  };

  const renderRunActionButton = (
    icon: string,
    label: string,
    onClick: () => void
  ) => (
    <TooltipTrigger delay={200} closeDelay={80}>
      <Button
        className="ide-run-icon-button"
        aria-label={label}
        onPress={onClick}
      >
        {icon}
      </Button>
      <Tooltip className="app-tooltip">{label}</Tooltip>
    </TooltipTrigger>
  );

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
              </AppDialog>
            </AppPopover>
          </DialogTrigger>
        </div>

        <section
          ref={dualStageRef}
          className={`play-dual-stage${isResizingPanels ? " is-resizing" : ""}`}
          style={dualStageStyle}
        >
          <aside className="device-shell terminal-device">
            <div className="device-header terminal-header">
              <span className="device-label">{t("board.programConsole")}</span>
              <span className="device-time">
                {sessionState.runState === "running" ? t("state.run") : t("state.edit")}
              </span>
            </div>

            <div className="terminal-panel">
              <div className={`ide-shell${isOutputVisible ? " has-output" : ""}`}>
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
                    {renderRunActionButton("▶", t("actions.play"), () => {
                      void controller.run();
                    })}
                    {renderRunActionButton("⏭", t("actions.step"), () => {
                      void controller.step();
                    })}
                    {renderRunActionButton("⏸", t("actions.pause"), () => {
                      controller.pause();
                    })}
                    {renderRunActionButton("↺", t("actions.reset"), () => {
                      controller.reset();
                    })}
                    {renderRunActionButton("🗑", t("actions.clear"), () => {
                      controller.clearDocument();
                    })}
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
                    onRequestTextInput={requestTextInput}
                    onRequestSelectInput={requestSelectInput}
                    onRequestDeclarationInput={requestDeclarationInput}
                    onShowAlert={showAlert}
                  />
                </div>

                {isOutputVisible ? (
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
                ) : null}
              </div>
            </div>
          </aside>

          {!isCompactLayout ? (
            <div
              className="play-stage-divider"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={startPanelResize}
            />
          ) : null}

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

        <AppModal isOpen={dialogState !== null} onOpenChange={(isOpen) => !isOpen && dismissDialog()}>
          {dialogState?.kind === "text" ? (
            <AppDialog title={dialogState.title}>
              <TextField
                autoFocus
                className="app-text-dialog-field"
                value={dialogValue}
                onChange={setDialogValue}
              >
                <Label className="app-text-dialog-label">{dialogState.title}</Label>
                <Input className="app-text-dialog-input" />
              </TextField>

              {dialogError ? <p className="app-dialog-error">{dialogError}</p> : null}

              <div className="app-dialog-actions">
                <Button className="app-dialog-button secondary" onPress={dismissDialog}>
                  {t("common.cancel")}
                </Button>
                <Button className="app-dialog-button" onPress={handleDialogSubmit}>
                  {t("common.save")}
                </Button>
              </div>
            </AppDialog>
          ) : null}

          {dialogState?.kind === "alert" ? (
            <AppDialog title={dialogState.title}>
              <p className="app-dialog-message">{dialogState.message}</p>
              <div className="app-dialog-actions">
                <Button className="app-dialog-button" onPress={handleDialogSubmit}>
                  {t("common.ok")}
                </Button>
              </div>
            </AppDialog>
          ) : null}

          {dialogState?.kind === "select" ? (
            <AppDialog title={dialogState.title}>
              <label className="app-text-dialog-label" htmlFor="app-select-dialog-input">
                {dialogState.title}
              </label>
              <select
                id="app-select-dialog-input"
                className="app-text-dialog-input"
                value={dialogValue}
                onChange={(event) => setDialogValue(event.target.value)}
                autoFocus
              >
                {dialogState.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {dialogError ? <p className="app-dialog-error">{dialogError}</p> : null}

              <div className="app-dialog-actions">
                <Button className="app-dialog-button secondary" onPress={dismissDialog}>
                  {t("common.cancel")}
                </Button>
                <Button className="app-dialog-button" onPress={handleDialogSubmit}>
                  {t("common.save")}
                </Button>
              </div>
            </AppDialog>
          ) : null}

          {dialogState?.kind === "declaration" ? (
            <AppDialog title={dialogState.title}>
              <label className="app-text-dialog-label" htmlFor="app-declaration-type-input">
                {dialogState.typeTitle}
              </label>
              <select
                id="app-declaration-type-input"
                className="app-text-dialog-input"
                value={dialogSecondaryValue}
                onChange={(event) => setDialogSecondaryValue(event.target.value)}
              >
                {dialogState.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <TextField
                autoFocus
                className="app-text-dialog-field"
                value={dialogValue}
                onChange={setDialogValue}
              >
                <Label className="app-text-dialog-label">{dialogState.nameTitle}</Label>
                <Input className="app-text-dialog-input" />
              </TextField>

              {dialogError ? <p className="app-dialog-error">{dialogError}</p> : null}

              <div className="app-dialog-actions">
                <Button className="app-dialog-button secondary" onPress={dismissDialog}>
                  {t("common.cancel")}
                </Button>
                <Button className="app-dialog-button" onPress={handleDialogSubmit}>
                  {t("common.save")}
                </Button>
              </div>
            </AppDialog>
          ) : null}
        </AppModal>
      </div>
    </Screen>
  );
}
