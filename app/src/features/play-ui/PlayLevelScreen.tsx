import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { JsonLevelRepository, LocalProgressRepository } from "@thesis/storage";
import { Panel, PuzzleBoard, Screen } from "@thesis/ui-editor";
import { createEditorDocument } from "../program-editor-core";
import { PlayEditorSurface } from "../program-editor-dom";
import {
  createPlaySessionController,
  type PlaySessionController,
  type PlaySessionState
} from "../play-session";
import { APP_ROUTES } from "../../types/routes";

const levelRepository = new JsonLevelRepository();
const progressRepository = new LocalProgressRepository();

const initialSessionState = (): PlaySessionState => ({
  level: null,
  structures: [],
  events: [],
  runState: "idle",
  stepCursor: 0,
  breakpointBlockIds: [],
  highlightedBlockId: null,
  status: "Loading level...",
  completedLevelIds: [],
  compiledProgram: {
    operations: [],
    operationOwnerIds: [],
    isComplete: false,
    unsupportedFeatures: [],
    diagnostics: []
  },
  document: createEditorDocument()
});

export function PlayLevelScreen() {
  const { levelId } = useParams<{ levelId: string }>();
  const [sessionState, setSessionState] = useState<PlaySessionState>(initialSessionState);
  const [isShowingGoalPreview, setIsShowingGoalPreview] = useState(false);
  const controllerRef = useRef<PlaySessionController | null>(null);

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

  if (!sessionState.level) {
    return (
      <Screen mode="player">
        <div className="settings-shell">
          <header className="topbar">
            <Link className="back-link" to={APP_ROUTES.play}>
              Back
            </Link>
            <div>
              <p className="eyebrow">Play Mode</p>
              <h1>Loading level</h1>
            </div>
          </header>
        </div>
      </Screen>
    );
  }

  const { level, compiledProgram } = sessionState;

  return (
    <Screen mode="player">
      <div className="play-shell">
        <header className="topbar">
          <Link className="back-link" to={APP_ROUTES.play}>
            Levels
          </Link>
          <div>
            <p className="eyebrow">Play Mode</p>
            <h1>{level.title}</h1>
          </div>
        </header>

        <section className="play-dual-stage">
          <aside className="device-shell terminal-device">
            <div className="device-header terminal-header">
              <span className="device-label">Program Console</span>
              <span className="device-time">
                {sessionState.runState === "running" ? "RUN" : "EDIT"}
              </span>
            </div>

            <div className="terminal-panel">
              <div className="scratch-shell">
                <div className="scratch-toolbar">
                  <button type="button" onClick={() => void controller.run()}>
                    Play
                  </button>
                  <button type="button" onClick={() => void controller.step()}>
                    Step
                  </button>
                  <button type="button" onClick={() => controller.pause()}>
                    Pause
                  </button>
                  <button type="button" onClick={() => controller.reset()}>
                    Reset
                  </button>
                  <button type="button" onClick={() => controller.clearDocument()}>
                    Clear
                  </button>
                </div>

                <PlayEditorSurface
                  structures={level.initialState}
                  allowedOperations={level.constraints.allowedOperations}
                  maxBlocks={level.constraints.maxSteps}
                  value={sessionState.document}
                  disabled={sessionState.runState === "running"}
                  highlightedBlockId={sessionState.highlightedBlockId}
                  breakpointBlockIds={sessionState.breakpointBlockIds}
                  onToggleBreakpoint={(blockId) => controller.toggleBreakpoint(blockId)}
                  onChange={(document) => controller.setDocument(document)}
                  onStatus={(message) => controller.setStatus(message)}
                />

                <div className="terminal-statusbar">
                  <span>{sessionState.status}</span>
                  <span>
                    {compiledProgram.operations.length}/{level.constraints.maxSteps} blocks
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <section className="device-shell board-device">
            <div className="device-header board-header">
              <span className="device-label">Play Board</span>
              <span className="device-time">
                {sessionState.completedLevelIds.includes(level.id) ? "DONE" : "LIVE"}
              </span>
            </div>

            <div className="board-surface">
              <div className="board-surface-grid" />

              <div className="board-content">
                <div className="board-console">
                  <div className="board-info-row">
                    <div className="board-chip-group">
                      <span className="mini-tag">Goal</span>
                      <span className="mini-tag">Max Steps: {level.constraints.maxSteps}</span>
                      <button
                        type="button"
                        className="mini-action"
                        onPointerDown={() => setIsShowingGoalPreview(true)}
                        onPointerUp={() => setIsShowingGoalPreview(false)}
                        onPointerLeave={() => setIsShowingGoalPreview(false)}
                        onPointerCancel={() => setIsShowingGoalPreview(false)}
                      >
                        Preview Result
                      </button>
                    </div>
                    <div className="board-chip-group">
                      {level.constraints.allowedOperations.map((operation) => (
                        <span key={operation} className="mini-tag">
                          {operation}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="board-description">
                    {level.metadata.description ?? "Solve the puzzle."}
                  </p>
                </div>

                <div className="board-visual-panel">
                  <PuzzleBoard
                    structures={isShowingGoalPreview ? level.goalState : sessionState.structures}
                  />
                </div>

                <div className="board-lower-panels">
                  <Panel title="Execution Feed" accent="#ffffff">
                    <div className="timeline-list">
                      {sessionState.events.length === 0 ? (
                        <p>Run your program to watch the data move.</p>
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
