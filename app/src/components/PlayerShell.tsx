import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  type EngineEvent,
  type ExecutionStep,
  type ProgramDefinition,
  type StructureSnapshot,
  VisualExecutionEngine
} from "@thesis/core-engine";
import type { LevelDefinition, PlayerPanelId } from "@thesis/game-system";
import { LocalProgressRepository, type ProgressData } from "@thesis/storage";
import { catalogLevelRepository } from "../backend";
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

const progressRepository = new LocalProgressRepository();

const transferProgram: ProgramDefinition = {
  operations: [{ type: "TRANSFER", sourceId: "A", targetId: "B" }]
};

const playerTabs: TabBarItem<PlayerPanelId>[] = [
  { id: "board", label: "" },
  { id: "steps", label: "" },
  { id: "timeline", label: "" }
];

export interface PlayerShellProps {}

export function PlayerShell(_props: PlayerShellProps) {
  const { t } = useTranslation();
  const [level, setLevel] = useState<LevelDefinition | null>(null);
  const [structures, setStructures] = useState<StructureSnapshot[]>([]);
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [status, setStatus] = useState(t("player.status.loading"));
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
      const loadedLevel = await catalogLevelRepository.getLevel("intro-transfer");
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
      setStatus(t("player.status.ready"));
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
    setStatus(t("player.status.reset"));
  };

  const runOneStep = () => {
    const engine = engineRef.current;
    if (!engine || !level) {
      return;
    }

    const result = engine.step();
    syncFromEngine();

    if (!result) {
      setStatus(t("player.status.noMoreSteps"));
      return;
    }

    setStatus(t("player.status.executedStep", { action: result.action.toLowerCase() }));
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
    setStatus(t("player.status.finished"));
  };

  const tabs = useMemo<TabBarItem<PlayerPanelId>[]>(() => ([
    { id: "board", label: t("player.tabs.puzzle") },
    { id: "steps", label: t("player.tabs.steps") },
    { id: "timeline", label: t("player.tabs.timeline") }
  ]), [t]);

  const panelContent = useMemo(() => {
    if (activePanel === "steps") {
      return (
        <Panel title={t("player.panels.stepControls")} accent="#fff7e8">
          <StepControls onStep={() => void runOneStep()} onRun={() => void runAll()} onReset={resetEngine} />
        </Panel>
      );
    }

    if (activePanel === "timeline") {
      return (
        <Panel title={t("player.panels.timeline")} accent="#f5fbff">
          <div className="timeline-list">
            {events.length === 0 ? <p>{t("player.noActionsYet")}</p> : null}
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
      <Panel title={level?.title ?? t("player.tabs.puzzle")} accent="#ffffff">
        <PuzzleBoard structures={structures} />
      </Panel>
    );
  }, [activePanel, events, level?.title, structures, t]);

  return (
    <Screen mode="player">
      <div className="player-shell">
        <header className="topbar">
          <Link className="back-link" to={APP_ROUTES.home}>
            {t("common.menu")}
          </Link>
          <div>
            <p className="eyebrow">{t("player.mode")}</p>
            <h1>{level?.title ?? t("player.status.loading")}</h1>
          </div>
        </header>

        <section className="player-status">
          <p>{status}</p>
          <LargeActionButton
            label={isSecondaryPanelOpen ? t("player.hideExtraPanel") : t("player.showExtraPanel")}
            onClick={togglePlayerSecondaryPanel}
            tone="secondary"
          />
        </section>

        <TabBar items={tabs} activeId={activePanel} onSelect={setPlayerActivePanel} />

        <section className="player-main-panel">{panelContent}</section>

        <CollapsiblePanel
          title={t("player.panels.quickControls")}
          isOpen={isSecondaryPanelOpen}
          onToggle={togglePlayerSecondaryPanel}
        >
          <StepControls onStep={() => void runOneStep()} onRun={() => void runAll()} onReset={resetEngine} />
        </CollapsiblePanel>
      </div>
    </Screen>
  );
}
