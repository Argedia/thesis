import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  type EngineEvent,
  type ExecutionStep,
  type ProgramDefinition,
  type StructureSnapshot,
  VisualExecutionEngine
} from "@thesis/core-engine";
import type { LevelDefinition, PlayerPanelId } from "@thesis/game-system";
import { JsonLevelRepository, LocalProgressRepository, type ProgressData } from "@thesis/storage";
import {
  CollapsiblePanel,
  LargeActionButton,
  Panel,
  PuzzleBoard,
  Screen,
  StepControls,
  TabBar,
  type TabBarItem
} from "@thesis/ui-editor";
import { APP_ROUTES } from "../types/routes";
import { useUiLayoutStore } from "../store/useUiLayoutStore";

const levelRepository = new JsonLevelRepository();
const progressRepository = new LocalProgressRepository();

const transferProgram: ProgramDefinition = {
  operations: [{ type: "TRANSFER", sourceId: "A", targetId: "B" }]
};

const playerTabs: TabBarItem<PlayerPanelId>[] = [
  { id: "board", label: "Puzzle" },
  { id: "steps", label: "Steps" },
  { id: "timeline", label: "Timeline" }
];

export interface PlayerShellProps {}

export function PlayerShell(_props: PlayerShellProps) {
  const [level, setLevel] = useState<LevelDefinition | null>(null);
  const [structures, setStructures] = useState<StructureSnapshot[]>([]);
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [status, setStatus] = useState("Loading puzzle...");
  const engineRef = useRef<VisualExecutionEngine | null>(null);
  const activePanel = useUiLayoutStore((state) => state.player.activePanel);
  const isSecondaryPanelOpen = useUiLayoutStore(
    (state) => state.player.isSecondaryPanelOpen
  );
  const setPlayerActivePanel = useUiLayoutStore((state) => state.setPlayerActivePanel);
  const togglePlayerSecondaryPanel = useUiLayoutStore(
    (state) => state.togglePlayerSecondaryPanel
  );

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    const load = async () => {
      const loadedLevel = await levelRepository.getLevel("intro-transfer");
      if (!active) {
        return;
      }

      setLevel(loadedLevel);
      setStructures(loadedLevel.initialState);
      setPlayerActivePanel(loadedLevel.playLayout.initialPanel);

      const engine = new VisualExecutionEngine({
        structures: loadedLevel.initialState
      });
      engine.loadProgram(transferProgram);
      unsubscribe = engine.subscribe((event) => {
        setEvents((current) => [...current, event]);
      });
      engineRef.current = engine;
      setStatus("Ready to play step by step.");
    };

    void load();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [setPlayerActivePanel]);

  const syncFromEngine = () => {
    const nextState = engineRef.current?.getState();
    if (!nextState) {
      return;
    }

    setStructures(Object.values(nextState.structures));
  };

  const resetEngine = () => {
    const engine = engineRef.current;
    if (!engine || !level) {
      return;
    }

    engine.reset();
    engine.loadProgram(transferProgram);
    setEvents([]);
    syncFromEngine();
    setStatus("Puzzle reset.");
  };

  const runOneStep = () => {
    const engine = engineRef.current;
    if (!engine || !level) {
      return;
    }

    const result = engine.step();
    syncFromEngine();

    if (!result) {
      setStatus("No more steps available.");
      return;
    }

    setStatus(`Executed ${result.action.toLowerCase()} step.`);
  };

  const runAll = async () => {
    const engine = engineRef.current;
    if (!engine || !level) {
      return;
    }

    resetEngine();

    let result: ExecutionStep | null = engine.step();
    syncFromEngine();

    while (result) {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      result = engine.step();
      syncFromEngine();
    }

    const progress: ProgressData = {
      completedLevelIds: level ? [level.id] : [],
      lastPlayedLevelId: level?.id
    };
    await progressRepository.saveProgress(progress);
    setStatus("Finished puzzle run.");
  };

  const panelContent = useMemo(() => {
    if (activePanel === "steps") {
      return (
        <Panel title="Step Controls" accent="#fff7e8">
          <StepControls onStep={() => void runOneStep()} onRun={() => void runAll()} onReset={resetEngine} />
        </Panel>
      );
    }

    if (activePanel === "timeline") {
      return (
        <Panel title="Timeline" accent="#f5fbff">
          <div className="timeline-list">
            {events.length === 0 ? <p>No actions yet.</p> : null}
            {events.map((event) => (
              <div key={`${event.stepId}-${event.type}-${event.structureId}`} className="timeline-entry">
                {event.type} · {event.structureId}
                {event.value !== undefined ? ` · ${event.value}` : ""}
              </div>
            ))}
          </div>
        </Panel>
      );
    }

    return (
      <Panel title={level?.title ?? "Puzzle"} accent="#ffffff">
        <PuzzleBoard structures={structures} />
      </Panel>
    );
  }, [activePanel, events, level?.title, structures]);

  return (
    <Screen mode="player">
      <div className="player-shell">
        <header className="topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            Menu
          </Link>
          <div>
            <p className="eyebrow">Player Mode</p>
            <h1>{level?.title ?? "Loading puzzle"}</h1>
          </div>
        </header>

        <section className="player-status">
          <p>{status}</p>
          <LargeActionButton
            label={isSecondaryPanelOpen ? "Hide Extra Panel" : "Show Extra Panel"}
            onClick={togglePlayerSecondaryPanel}
            tone="secondary"
          />
        </section>

        <TabBar items={playerTabs} activeId={activePanel} onSelect={setPlayerActivePanel} />

        <section className="player-main-panel">{panelContent}</section>

        <CollapsiblePanel
          title="Quick Controls"
          isOpen={isSecondaryPanelOpen}
          onToggle={togglePlayerSecondaryPanel}
        >
          <StepControls onStep={() => void runOneStep()} onRun={() => void runAll()} onReset={resetEngine} />
        </CollapsiblePanel>
      </div>
    </Screen>
  );
}
