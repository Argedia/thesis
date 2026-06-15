import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PuzzleBoard } from "@thesis/ui-editor";
import { getRunLineDelayMs } from "../settings/execution-speed";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import type { EngineEvent, StructureSnapshot } from "@thesis/core-engine";
import type { HeapObjectSnapshot, RuntimeVariableSnapshot } from "../play-session/types";
import type { StructureConfigClickPayload } from "@thesis/ui-editor";
import { tutorialAnchorProps } from "../tutorial/anchors";

interface BoardPanelProps {
  levelId: string;
  isCompleted: boolean;
  isShowingGoalPreview: boolean;
  onTogglePreview?: () => void;
  structures: StructureSnapshot[];
  goalState: StructureSnapshot[];
  variableSnapshots: RuntimeVariableSnapshot[];
  heapSnapshots: HeapObjectSnapshot[];
  events?: EngineEvent[];
  showStructureConfigActions?: boolean;
  onStructureConfigClick?: (payload: StructureConfigClickPayload) => void;
  onReset?: () => void;
  isRunning?: boolean;
  onAddStructure?: () => void;
  isConfigOpen?: boolean;
  onToggleConfig?: () => void;
}

export function BoardPanel({
  levelId: _levelId,
  isCompleted,
  isShowingGoalPreview,
  onTogglePreview,
  structures,
  goalState,
  variableSnapshots,
  heapSnapshots,
  events = [],
  showStructureConfigActions = false,
  onStructureConfigClick,
  onReset,
  isRunning = false,
  onAddStructure,
  isConfigOpen = false,
  onToggleConfig
}: BoardPanelProps) {
  const { t } = useTranslation();
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const consoleBodyRef = useRef<HTMLDivElement | null>(null);
  const addStructureLabel = t("board.addStructure");
  const configureBoardLabel = t("board.configureBoard");

  useEffect(() => {
    if (isConsoleExpanded && consoleBodyRef.current) {
      consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
    }
  }, [events, isConsoleExpanded]);

  return (
    <section className="device-shell board-device" {...tutorialAnchorProps("editor-board-panel")}>
      <div className="device-header board-header" {...tutorialAnchorProps("play-board-header")}>
        <span className="device-label">{t("board.playBoard")}</span>
        <div className="board-header-actions">
          {onReset ? (
            <TooltipTrigger delay={200} closeDelay={80}>
              <Button
                className="board-preview-action board-icon-action"
                onPress={onReset}
                isDisabled={isRunning}
                aria-label={t("actions.reset")}
              >
                ↺
              </Button>
              <Tooltip className="app-tooltip">{t("actions.reset")}</Tooltip>
            </TooltipTrigger>
          ) : null}
          <button
            type="button"
            className={`board-preview-action${isShowingGoalPreview ? " is-active" : ""}`}
            {...tutorialAnchorProps("play-preview-goal")}
            onClick={onTogglePreview}
          >
            {isShowingGoalPreview ? t("common.hideResult") : t("common.previewResult")}
          </button>
          {onToggleConfig ? (
            <TooltipTrigger delay={200} closeDelay={80}>
              <Button
                {...tutorialAnchorProps("editor-board-config-button")}
                className={`board-preview-action board-icon-action board-config-action${isConfigOpen ? " is-active" : ""}`}
                onPress={onToggleConfig}
                aria-label={configureBoardLabel}
              >
                ⚙
              </Button>
              <Tooltip className="app-tooltip">{configureBoardLabel}</Tooltip>
            </TooltipTrigger>
          ) : null}
          <span className="device-time">{isCompleted ? t("state.done") : t("state.live")}</span>
        </div>
      </div>

      <div className="board-surface">
        <div className="board-surface-grid" />
        <div className="board-visual-panel">
          {onAddStructure ? (
            <div className="board-canvas-actions">
              <TooltipTrigger delay={200} closeDelay={80}>
                <Button
                  className="board-preview-action board-icon-action board-add-structure-action"
                  onPress={onAddStructure}
                  aria-label={addStructureLabel}
                >
                  +
                </Button>
                <Tooltip className="app-tooltip">{addStructureLabel}</Tooltip>
              </TooltipTrigger>
            </div>
          ) : null}
          <PuzzleBoard
            structures={isShowingGoalPreview ? goalState : structures}
            variables={isShowingGoalPreview ? [] : variableSnapshots}
            heapObjects={isShowingGoalPreview ? [] : heapSnapshots}
            events={isShowingGoalPreview ? [] : events}
            showStructureConfigActions={showStructureConfigActions}
            onStructureConfigClick={onStructureConfigClick}
            stepDurationMs={getRunLineDelayMs()}
            isPreview={isShowingGoalPreview}
          />
        </div>

        {(() => {
          const displayEvents = events.filter(e => e.type !== "STRUCTURE_UPDATED");
          const getOpLabel = (event: EngineEvent): string => {
            const parts = event.stepId.split("-");
            const op = parts.length >= 2 ? parts[1] : null;
            return op ? op.toUpperCase() : event.type.replace("_", " ");
          };
          const getOpSlug = (event: EngineEvent): string => {
            const parts = event.stepId.split("-");
            const op = parts.length >= 2 ? parts[1] : null;
            return op ? `op-${op}` : event.type.toLowerCase().replace("_", "-");
          };
          const last = displayEvents[displayEvents.length - 1];
          return (
            <div className={`board-console${isConsoleExpanded ? " expanded" : ""}`}>
              {isConsoleExpanded ? (
                <div ref={consoleBodyRef} className="board-console-body">
                  {displayEvents.map((event, i) => (
                    <div key={`${event.stepId}-${event.type}-${i}`} className="ide-output-line console-event">
                      <span className="console-step">#{i + 1}</span>
                      <span className="console-structure">{event.structureId}</span>
                      <span className="console-muted">–</span>
                      <span className={`console-badge badge-${getOpSlug(event)}`}>{getOpLabel(event)}</span>
                      {event.value !== undefined ? <span className="console-value">({String(event.value)})</span> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="board-console-bar" onClick={() => setIsConsoleExpanded(p => !p)}>
                {last ? (
                  <>
                    <span className="board-console-struct">{last.structureId}</span>
                    <span className="console-muted">–</span>
                    <span className={`console-badge badge-${getOpSlug(last)}`}>{getOpLabel(last)}</span>
                    {last.value !== undefined ? <span className="board-console-value">({String(last.value)})</span> : null}
                    <span className="board-console-count">{displayEvents.length} eventos</span>
                  </>
                ) : <span className="board-console-empty">— sin eventos —</span>}
                <span className="board-console-toggle">{isConsoleExpanded ? "▾" : "▴"}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}
