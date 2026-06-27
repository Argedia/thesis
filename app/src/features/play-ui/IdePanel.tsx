import { useRef, useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import type { StructureSnapshot } from "@thesis/core-engine";
import type { EditorDocument, CompiledRoutine } from "../program-editor-core/types";
import { PlayEditorSurface } from "../../play-editor/PlayEditorSurface";
import type { DialogManager } from "./useDialogManager";
import { tutorialAnchorProps } from "../tutorial/anchors";

interface IdePanelProps {
  document: EditorDocument;
  activeRoutineCompiled: CompiledRoutine;
  runState: string;
  highlightedNodeId: string | null;
  breakpointNodeIds: string[];
  events: Array<{ stepId: string; type: string; structureId: string; value?: unknown }>;
  structures: StructureSnapshot[];
  lockedBlockIds?: string[];
  allowedOperations: string[];
  blockLimits?: Record<string, number>;
  onSetBlockLimit?: (limitKey: string, nextValue: number) => void;
  maxSteps: number;
  maxBlocksForActiveRoutine?: number;
  maxBlocksForDisplay?: number;
  outputMode: "hidden" | "runtime" | "diagnostics";
  visibleRoutineOperations: number;
  dialog: DialogManager;
  onToggleBreakpoint: (nodeId: string) => void;
  onChange: (document: EditorDocument) => void;
  onStatus: (message: string) => void;
  onSelectRoutine: (routineId: string) => void;
  onRenameRoutine: (routineId: string, currentName: string) => void;
  onCreateRoutine: () => void;
  disableCreateRoutine?: boolean;
  hideRunActions?: boolean;
  disabledRunButtons?: boolean;
  onRun: () => void;
  onStep: () => void;
  onPause: () => void;
  onClear: () => void;
  translateDiagnostic: (diagnostic: string) => string;
  status: string;
  headerActions?: ReactNode;
  topbarControls?: ReactNode;
  hideOutputBlocksCounter?: boolean;
  outputMetaControl?: ReactNode;
}

function RunIconButton({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <TooltipTrigger delay={200} closeDelay={80}>
      <Button
        className={`ide-run-icon-button${disabled ? " is-disabled" : ""}`}
        aria-label={label}
        onPress={disabled ? undefined : onClick}
        isDisabled={disabled}
      >
        {icon}
      </Button>
      <Tooltip className="app-tooltip">{label}</Tooltip>
    </TooltipTrigger>
  );
}

export function IdePanel({
  document,
  activeRoutineCompiled,
  runState,
  highlightedNodeId,
  breakpointNodeIds,
  events,
  structures,
  lockedBlockIds,
  allowedOperations,
  blockLimits,
  onSetBlockLimit,
  maxSteps,
  maxBlocksForActiveRoutine,
  maxBlocksForDisplay,
  outputMode,
  visibleRoutineOperations,
  dialog,
  disabledRunButtons,
  onToggleBreakpoint,
  onChange,
  onStatus,
  onSelectRoutine,
  onRenameRoutine,
  onCreateRoutine,
  disableCreateRoutine,
  hideRunActions,
  onRun,
  onStep,
  onPause,
  onClear,
  translateDiagnostic,
  status,
  headerActions,
  topbarControls,
  hideOutputBlocksCounter,
  outputMetaControl
}: IdePanelProps) {
  const { t } = useTranslation();
  const routineTabsRef = useRef<HTMLDivElement | null>(null);
  const outputBodyRef = useRef<HTMLDivElement | null>(null);
  const isOutputVisible = outputMode !== "hidden";
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);

  useEffect(() => {
    if (!isOutputCollapsed && outputBodyRef.current) {
      outputBodyRef.current.scrollTop = outputBodyRef.current.scrollHeight;
    }
  }, [events, isOutputCollapsed]);
  const addScriptLabel = t("actions.addScript");
  const outputToggleLabel = isOutputCollapsed ? t("board.expandOutput") : t("board.collapseOutput");
  const maxBlocksForSurface = Math.max(0, Math.floor(maxBlocksForActiveRoutine ?? maxSteps));
  const maxBlocksForCounter = Math.max(0, Math.floor(maxBlocksForDisplay ?? maxSteps));

  return (
    <aside
      className="device-shell terminal-device"
      {...tutorialAnchorProps("editor-ide-panel")}
    >
      <div className="device-header terminal-header" {...tutorialAnchorProps("play-program-header")}>
        <span className="device-label">{t("board.programConsole")}</span>
        <div className="terminal-header-actions">
          {headerActions}
        </div>
      </div>

      <div className="terminal-panel">
        <div className={`ide-shell${isOutputVisible ? " has-output" : ""}${isOutputVisible && isOutputCollapsed ? " output-collapsed" : ""}`}>
          <div className="ide-topbar">
            <div ref={routineTabsRef} className="routine-strip ide-tabs">
              {document.routines.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  className={`routine-chip${routine.id === document.activeRoutineId ? " active" : ""}`}
                  disabled={runState === "running"}
                  onClick={() => onSelectRoutine(routine.id)}
                  onDoubleClick={() => onRenameRoutine(routine.id, routine.name)}
                >
                  {routine.name}
                </button>
              ))}
              {!disableCreateRoutine && (
                <TooltipTrigger delay={200} closeDelay={80}>
                  <Button
                    className="routine-chip routine-chip-add"
                    aria-label={addScriptLabel}
                    isDisabled={runState === "running"}
                    onPress={onCreateRoutine}
                  >
                    +
                  </Button>
                  <Tooltip className="app-tooltip">{addScriptLabel}</Tooltip>
                </TooltipTrigger>
              )}
            </div>
            {topbarControls ? (
              <div className="ide-topbar-controls">
                {topbarControls}
              </div>
            ) : null}

            {!hideRunActions ? (
              <div className="ide-run-actions" {...tutorialAnchorProps("play-run-actions")}>
                <RunIconButton icon="▶" label={t("actions.play")} onClick={onRun} disabled={disabledRunButtons} />
                <RunIconButton icon="⏭" label={t("actions.step")} onClick={onStep} disabled={disabledRunButtons} />
                <RunIconButton icon="⏹" label={t("actions.stop")} onClick={onPause} disabled={disabledRunButtons} />
                <RunIconButton icon="🗑" label={t("actions.clear")} onClick={onClear} disabled={disabledRunButtons} />
              </div>
            ) : null}
          </div>

          <div className="ide-editor-frame" {...tutorialAnchorProps("play-program-surface")}>
            <PlayEditorSurface
              structures={structures}
              lockedBlockIds={lockedBlockIds}
              allowedOperations={allowedOperations}
              blockLimits={blockLimits}
              onSetBlockLimit={onSetBlockLimit}
              maxBlocks={maxBlocksForSurface}
              value={document}
              disabled={runState === "running"}
              highlightedNodeId={highlightedNodeId}
              breakpointNodeIds={breakpointNodeIds}
              onToggleBreakpoint={onToggleBreakpoint}
              onChange={onChange}
              onStatus={onStatus}
              onRequestTextInput={dialog.requestTextInput}
              onRequestSelectInput={dialog.requestSelectInput}
              onRequestDeclarationInput={dialog.requestDeclarationInput}
              onShowAlert={dialog.showAlert}
            />
          </div>

          {isOutputVisible ? (
            <div className={`ide-output-panel${isOutputCollapsed ? " collapsed" : ""}`}>
              <div className="ide-output-tabs">
                <span className="ide-output-tab active">{t("board.output").toUpperCase()}</span>
                <TooltipTrigger delay={200} closeDelay={80}>
                  <Button
                    className="ide-output-toggle"
                    aria-label={outputToggleLabel}
                    onPress={() => setIsOutputCollapsed((previous) => !previous)}
                  >
                    {isOutputCollapsed ? "▴" : "▾"}
                  </Button>
                  <Tooltip className="app-tooltip">{outputToggleLabel}</Tooltip>
                </TooltipTrigger>
                {outputMetaControl}
                {!hideOutputBlocksCounter ? (
                  <span className={`ide-output-meta ide-output-meta--${maxBlocksForCounter <= 0 ? "green" : visibleRoutineOperations / maxBlocksForCounter > 0.8 ? "red" : visibleRoutineOperations / maxBlocksForCounter > 0.5 ? "yellow" : "green"}`}>
                    {t("board.blocksCount", { count: visibleRoutineOperations, max: maxBlocksForCounter })}
                  </span>
                ) : null}
              </div>
              <div ref={outputBodyRef} className="ide-output-body" hidden={isOutputCollapsed}>
                {outputMode === "diagnostics" ? (
                  <>
                    <div className="ide-output-line console-status">{translateDiagnostic(status)}</div>
                    {activeRoutineCompiled.diagnostics.length > 0 ? (
                      activeRoutineCompiled.diagnostics.map((d, i) => (
                        <div key={`${d}-${i}`} className="ide-output-line console-error">
                          <span className="console-badge badge-error">⚠️</span>
                          <span>{translateDiagnostic(d)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="ide-output-line console-muted">{t("board.runHint")}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="ide-output-line console-status">{translateDiagnostic(status)}</div>
                    {events.length === 0 ? (
                      <div className="ide-output-line console-muted">{t("board.runHint")}</div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
