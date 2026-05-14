import { useTranslation } from "react-i18next";
import { PuzzleBoard } from "@thesis/ui-editor";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import type { EngineEvent, StructureSnapshot } from "@thesis/core-engine";
import type { HeapObjectSnapshot, RuntimeVariableSnapshot } from "../play-session/types";
import type { StructureConfigClickPayload } from "@thesis/ui-editor";

interface BoardPanelProps {
  levelId: string;
  isCompleted: boolean;
  isShowingGoalPreview: boolean;
  onPreviewPointerDown?: () => void;
  onPreviewPointerUp?: () => void;
  onPreviewPointerLeave?: () => void;
  onPreviewPointerCancel?: () => void;
  structures: StructureSnapshot[];
  goalState: StructureSnapshot[];
  variableSnapshots: RuntimeVariableSnapshot[];
  heapSnapshots: HeapObjectSnapshot[];
  events?: EngineEvent[];
  showStructureConfigActions?: boolean;
  onStructureConfigClick?: (payload: StructureConfigClickPayload) => void;
  onAddStructure?: () => void;
  isConfigOpen?: boolean;
  onToggleConfig?: () => void;
}

export function BoardPanel({
  levelId: _levelId,
  isCompleted,
  isShowingGoalPreview,
  onPreviewPointerDown,
  onPreviewPointerUp,
  onPreviewPointerLeave,
  onPreviewPointerCancel,
  structures,
  goalState,
  variableSnapshots,
  heapSnapshots,
  events = [],
  showStructureConfigActions = false,
  onStructureConfigClick,
  onAddStructure,
  isConfigOpen = false,
  onToggleConfig
}: BoardPanelProps) {
  const { t } = useTranslation();
  const addStructureLabel = t("board.addStructure");
  const configureBoardLabel = t("board.configureBoard");

  return (
    <section className="device-shell board-device">
      <div className="device-header board-header">
        <span className="device-label">{t("board.playBoard")}</span>
        <div className="board-header-actions">
          <button
            type="button"
            className="board-preview-action"
            onPointerDown={onPreviewPointerDown}
            onPointerUp={onPreviewPointerUp}
            onPointerLeave={onPreviewPointerLeave}
            onPointerCancel={onPreviewPointerCancel}
          >
            {t("common.previewResult")}
          </button>
          {onToggleConfig ? (
            <TooltipTrigger delay={200} closeDelay={80}>
              <Button
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
        <div className="board-content">
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
            />
          </div>
        </div>
      </div>
    </section>
  );
}
