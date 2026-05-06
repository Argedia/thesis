import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import type { StructureSnapshot } from "@thesis/core-engine";
import type { EditorDocument, CompiledRoutine } from "../program-editor-core/types";
import { PlayEditorSurface } from "../../play-editor/PlayEditorSurface";
import type { DialogManager } from "./useDialogManager";

interface IdePanelProps {
  document: EditorDocument;
  activeRoutineCompiled: CompiledRoutine;
  runState: string;
  highlightedNodeId: string | null;
  breakpointNodeIds: string[];
  events: Array<{ stepId: string; type: string; structureId: string; value?: unknown }>;
  structures: StructureSnapshot[];
  allowedOperations: string[];
  blockLimits?: Record<string, number>;
  onSetBlockLimit?: (limitKey: string, nextValue: number) => void;
  maxSteps: number;
  outputMode: "hidden" | "runtime" | "diagnostics";
  visibleRoutineOperations: number;
  dialog: DialogManager;
  onToggleBreakpoint: (nodeId: string) => void;
  onChange: (document: EditorDocument) => void;
  onStatus: (message: string) => void;
  onSelectRoutine: (routineId: string) => void;
  onRenameRoutine: (routineId: string, currentName: string) => void;
  onCreateRoutine: () => void;
  disabledRunButtons?: boolean;
  onRun: () => void;
  onStep: () => void;
  onPause: () => void;
  onReset: () => void;
  onClear: () => void;
  translateDiagnostic: (diagnostic: string) => string;
  status: string;
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
  allowedOperations,
  blockLimits,
  onSetBlockLimit,
  maxSteps,
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
  onRun,
  onStep,
  onPause,
  onReset,
  onClear,
  translateDiagnostic,
  status
}: IdePanelProps) {
  const { t } = useTranslation();
  const routineTabsRef = useRef<HTMLDivElement | null>(null);
  const isOutputVisible = outputMode !== "hidden";
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true);

  return (
    <aside className="device-shell terminal-device">
      <div className="device-header terminal-header">
        <span className="device-label">{t("board.programConsole")}</span>
        <span className="device-time">{runState === "running" ? t("state.run") : t("state.edit")}</span>
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
              <button
                type="button"
                className="routine-chip routine-chip-add"
                disabled={runState === "running"}
                onClick={onCreateRoutine}
              >
                +
              </button>
            </div>

            <div className="ide-run-actions">
              <RunIconButton icon="▶" label={t("actions.play")} onClick={onRun} disabled={disabledRunButtons} />
              <RunIconButton icon="⏭" label={t("actions.step")} onClick={onStep} disabled={disabledRunButtons} />
              <RunIconButton icon="⏸" label={t("actions.pause")} onClick={onPause} disabled={disabledRunButtons} />
              <RunIconButton icon="↺" label={t("actions.reset")} onClick={onReset} disabled={disabledRunButtons} />
              <RunIconButton icon="🗑" label={t("actions.clear")} onClick={onClear} disabled={disabledRunButtons} />
            </div>
          </div>

          <div className="ide-editor-frame">
            <PlayEditorSurface
              structures={structures}
              allowedOperations={allowedOperations}
              blockLimits={blockLimits}
              onSetBlockLimit={onSetBlockLimit}
              maxBlocks={maxSteps}
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
                <button
                  type="button"
                  className="ide-output-toggle"
                  aria-label={isOutputCollapsed ? "Expand output" : "Collapse output"}
                  onClick={() => setIsOutputCollapsed((previous) => !previous)}
                >
                  {isOutputCollapsed ? "▴" : "▾"}
                </button>
                <span className="ide-output-meta">
                  {t("board.blocksCount", { count: visibleRoutineOperations, max: maxSteps })}
                </span>
              </div>
              <div className="ide-output-body" hidden={isOutputCollapsed}>
                <div className="ide-output-line primary">{translateDiagnostic(status)}</div>
                {outputMode === "diagnostics" ? (
                  activeRoutineCompiled.diagnostics.length > 0 ? (
                    activeRoutineCompiled.diagnostics.slice(0, 6).map((d, i) => (
                      <div key={`${d}-${i}`} className="ide-output-line">{translateDiagnostic(d)}</div>
                    ))
                  ) : (
                    <div className="ide-output-line muted">{t("board.runHint")}</div>
                  )
                ) : events.length === 0 ? (
                  <div className="ide-output-line muted">{t("board.runHint")}</div>
                ) : (
                  events.slice(-6).map((event, i) => (
                    <div key={`${event.stepId}-${event.type}-${i}`} className="ide-output-line">
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
  );
}
