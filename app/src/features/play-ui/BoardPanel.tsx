import { useTranslation } from "react-i18next";
import { Panel, PuzzleBoard } from "@thesis/ui-editor";
import type { StructureSnapshot } from "@thesis/core-engine";
import type { RuntimeVariableSnapshot } from "../play-session/types";
import type { StructureConfigClickPayload } from "@thesis/ui-editor";

interface BoardPanelProps {
  levelId: string;
  isCompleted: boolean;
  isShowingGoalPreview: boolean;
  structures: StructureSnapshot[];
  goalState: StructureSnapshot[];
  variableSnapshots: RuntimeVariableSnapshot[];
  events: Array<{ stepId: string; type: string; structureId: string; value?: unknown }>;
  showStructureConfigActions?: boolean;
  onStructureConfigClick?: (payload: StructureConfigClickPayload) => void;
}

export function BoardPanel({
  levelId: _levelId,
  isCompleted,
  isShowingGoalPreview,
  structures,
  goalState,
  variableSnapshots,
  events,
  showStructureConfigActions = false,
  onStructureConfigClick
}: BoardPanelProps) {
  const { t } = useTranslation();

  return (
    <section className="device-shell board-device">
      <div className="device-header board-header">
        <span className="device-label">{t("board.playBoard")}</span>
        <span className="device-time">{isCompleted ? t("state.done") : t("state.live")}</span>
      </div>

      <div className="board-surface">
        <div className="board-surface-grid" />
        <div className="board-content">
          <div className="board-visual-panel">
            <PuzzleBoard
              structures={isShowingGoalPreview ? goalState : structures}
              variables={isShowingGoalPreview ? [] : variableSnapshots}
              showStructureConfigActions={showStructureConfigActions}
              onStructureConfigClick={onStructureConfigClick}
            />
          </div>

          <div className="board-lower-panels">
            <Panel title={t("board.executionFeed")} accent="#ffffff">
              <div className="timeline-list">
                {events.length === 0 ? <p>{t("board.feedHint")}</p> : null}
                {events.map((event, i) => (
                  <div key={`${event.stepId}-${event.type}-${i}`} className="timeline-entry">
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
  );
}
