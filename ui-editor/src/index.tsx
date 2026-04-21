import {
  normalizeStructureSnapshot,
  type DataValue,
  type DataNode,
  type EngineEvent,
  type StructureSnapshot
} from "@thesis/core-engine";
import type { EditorPanelId, PlayerPanelId } from "@thesis/game-system";
import i18next from "i18next";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

const cardStyle: CSSProperties = {
  border: "4px solid #ffffff",
  borderRadius: "28px",
  padding: "1rem",
  background: "#fff4dc"
};

export interface StructuresBoardProps {
  structures: StructureSnapshot[];
  handValue?: string | number | null;
  variables?: BoardVariableSnapshot[];
}

export interface BoardVariableSnapshot {
  name: string;
  value: DataValue;
  routineName?: string;
}

const t = (key: string, options?: Record<string, unknown>) =>
  i18next.t(key, options) as string;

const boardWrapperStyle: CSSProperties = {
  ...cardStyle,
  padding: "0.75rem",
  background: "#f7fbff"
};

const boardCanvasFrameStyle: CSSProperties = {
  width: "100%",
  minHeight: "360px",
  borderRadius: "22px",
  border: "2px solid #d3e4f4",
  background: "#ecf6ff",
  overflow: "hidden"
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

export function StructuresBoard({ structures, variables = [] }: StructuresBoardProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) {
      return;
    }

    const draw = () => {
      const normalizedStructures = structures.map((structure) => normalizeStructureSnapshot(structure));
      const width = Math.max(host.clientWidth, 320);
      const cardCount = normalizedStructures.length + (variables.length > 0 ? 1 : 0);
      const height = Math.max(340, Math.ceil(cardCount / 2) * 250);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "#dbeeff";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(74, 109, 145, 0.16)";
      ctx.lineWidth = 1;
      for (let x = 20; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 20; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const columns = width > 760 ? 2 : 1;
      const gutter = 28;
      const cellWidth = (width - gutter * (columns + 1)) / columns;
      const cellHeight = 210;

      normalizedStructures.forEach((structure, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const frameX = gutter + column * (cellWidth + gutter);
        const frameY = 28 + row * (cellHeight + 28);
        const frameWidth = cellWidth;
        const frameHeight = cellHeight;
        const structureColor =
          structure.properties?.color ??
          (structure.kind === "stack"
            ? "#ffd36e"
            : structure.kind === "queue"
              ? "#a8dcff"
              : "#d7c3ff");
        const labelColor =
          structure.kind === "stack"
            ? "#b78312"
            : structure.kind === "queue"
              ? "#2f7cb8"
              : "#7c52ba";

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, 26);
        ctx.fill();
        ctx.strokeStyle = "#d3e4f4";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = "800 13px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
        ctx.fillStyle = labelColor;
        ctx.fillText(t(`structures.${structure.kind}`).toUpperCase(), frameX + 20, frameY + 24);

        ctx.font = "900 30px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
        ctx.fillStyle = "#355070";
        ctx.fillText(structure.id, frameX + 18, frameY + 58);

        ctx.font = "700 14px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
        ctx.fillStyle = "#6d8297";
        ctx.textAlign = "right";
        ctx.fillText(
          `${structure.values.length} ${t("common.items")}`,
          frameX + frameWidth - 18,
          frameY + 24
        );
        ctx.textAlign = "start";

        if (structure.kind === "stack") {
          const slotWidth = Math.min(120, frameWidth * 0.34);
          const slotHeight = 34;
          const towerX = frameX + frameWidth * 0.5 - slotWidth * 0.5;
          const baseY = frameY + frameHeight - 26;
          const topY = frameY + 76;

          ctx.strokeStyle = "#7b93ab";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(towerX, topY);
          ctx.lineTo(towerX, baseY);
          ctx.moveTo(towerX + slotWidth, topY);
          ctx.lineTo(towerX + slotWidth, baseY);
          ctx.moveTo(towerX - 10, baseY);
          ctx.lineTo(towerX + slotWidth + 10, baseY);
          ctx.stroke();

          structure.values.forEach((node, valueIndex) => {
            const itemY = baseY - slotHeight - valueIndex * (slotHeight + 6);
            const item = node as DataNode;
            ctx.fillStyle = item.color ?? structureColor;
            drawRoundedRect(ctx, towerX + 8, itemY, slotWidth - 16, slotHeight, 10);
            ctx.fill();
            ctx.strokeStyle = "rgba(53, 80, 112, 0.18)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#355070";
            ctx.font = "800 14px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(String(item.value), towerX + slotWidth / 2, itemY + 22);
            ctx.textAlign = "start";
          });
        } else if (structure.kind === "queue") {
          const itemWidth = 58;
          const itemHeight = 58;
          const laneX = frameX + 20;
          const laneY = frameY + 122;
          const startX = frameX + 28;
          const maxVisible = Math.max(1, Math.floor((frameWidth - 56) / (itemWidth + 8)));

          ctx.strokeStyle = "#7b93ab";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(laneX, laneY);
          ctx.lineTo(frameX + frameWidth - 20, laneY);
          ctx.stroke();

          structure.values.slice(0, maxVisible).forEach((node, valueIndex) => {
            const itemX = startX + valueIndex * (itemWidth + 8);
            const itemY = laneY - itemHeight - 8;
            const item = node as DataNode;
            ctx.fillStyle = item.color ?? structureColor;
            drawRoundedRect(ctx, itemX, itemY, itemWidth, itemHeight, 12);
            ctx.fill();
            ctx.strokeStyle = "rgba(53, 80, 112, 0.18)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#355070";
            ctx.font = "800 16px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(String(item.value), itemX + itemWidth / 2, itemY + 35);
            ctx.textAlign = "start";
          });

          if (structure.values.length > maxVisible) {
            ctx.fillStyle = "#6d8297";
            ctx.font = "700 14px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
            ctx.fillText(`+${structure.values.length - maxVisible}`, frameX + frameWidth - 54, frameY + 96);
          }
        } else {
          const itemWidth = 58;
          const itemHeight = 42;
          const laneX = frameX + 26;
          const laneY = frameY + 126;
          const startX = frameX + 30;
          const maxVisible = Math.max(1, Math.floor((frameWidth - 60) / (itemWidth + 16)));

          ctx.strokeStyle = "#8e79c2";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(laneX, laneY);
          ctx.lineTo(frameX + frameWidth - 24, laneY);
          ctx.stroke();

          structure.values.slice(0, maxVisible).forEach((node, valueIndex) => {
            const itemX = startX + valueIndex * (itemWidth + 16);
            const itemY = laneY - itemHeight - 10;
            const item = node as DataNode;

            if (valueIndex > 0) {
              ctx.strokeStyle = "rgba(124, 82, 186, 0.45)";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(itemX - 14, itemY + itemHeight / 2);
              ctx.lineTo(itemX - 4, itemY + itemHeight / 2);
              ctx.stroke();
            }

            ctx.fillStyle = item.color ?? structureColor;
            drawRoundedRect(ctx, itemX, itemY, itemWidth, itemHeight, 12);
            ctx.fill();
            ctx.strokeStyle = "rgba(53, 80, 112, 0.18)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#355070";
            ctx.font = "800 15px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(String(item.value), itemX + itemWidth / 2, itemY + 27);
            ctx.textAlign = "start";
          });

          if (structure.values.length > maxVisible) {
            ctx.fillStyle = "#6d8297";
            ctx.font = "700 14px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
            ctx.fillText(`+${structure.values.length - maxVisible}`, frameX + frameWidth - 54, frameY + 96);
          }
        }

        if (structure.values.length === 0) {
          ctx.fillStyle = "#9eb0bf";
          ctx.font = "700 15px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(t("common.empty"), frameX + frameWidth / 2, frameY + frameHeight / 2 + 18);
          ctx.textAlign = "start";
        }
      });

      if (variables.length > 0) {
        const index = normalizedStructures.length;
        const column = index % columns;
        const row = Math.floor(index / columns);
        const frameX = gutter + column * (cellWidth + gutter);
        const frameY = 28 + row * (cellHeight + 28);
        const frameWidth = cellWidth;
        const frameHeight = cellHeight;
        const maxVisible = Math.min(variables.length, 6);

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, 26);
        ctx.fill();
        ctx.strokeStyle = "#d3e4f4";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = "800 13px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
        ctx.fillStyle = "#4f79b6";
        ctx.fillText(t("common.variables").toUpperCase(), frameX + 20, frameY + 24);

        ctx.font = "900 30px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
        ctx.fillStyle = "#355070";
        ctx.fillText(t("structures.variablesShort"), frameX + 18, frameY + 58);

        ctx.font = "700 14px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
        ctx.fillStyle = "#6d8297";
        ctx.textAlign = "right";
        ctx.fillText(
          `${variables.length} ${t("common.items")}`,
          frameX + frameWidth - 18,
          frameY + 24
        );
        ctx.textAlign = "start";

        variables.slice(0, maxVisible).forEach((variable, variableIndex) => {
          const itemX = frameX + 22;
          const itemY = frameY + 74 + variableIndex * 22;
          const itemWidth = frameWidth - 44;
          const itemHeight = 18;

          ctx.fillStyle = "#edf5ff";
          drawRoundedRect(ctx, itemX, itemY, itemWidth, itemHeight, 9);
          ctx.fill();

          ctx.fillStyle = "#355070";
          ctx.font = "800 12px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
          ctx.textAlign = "start";
          ctx.fillText(variable.name, itemX + 10, itemY + 12.5);

          ctx.fillStyle = "#4f79b6";
          ctx.textAlign = "right";
          ctx.fillText(String(variable.value), frameX + frameWidth - 30, itemY + 12.5);
          ctx.textAlign = "start";
        });

        if (variables.length > maxVisible) {
          ctx.fillStyle = "#6d8297";
          ctx.font = "700 14px Trebuchet MS, Arial Rounded MT Bold, sans-serif";
          ctx.fillText(
            `+${variables.length - maxVisible} ${t("common.more")}`,
            frameX + 24,
            frameY + frameHeight - 22
          );
        }
      }
    };

    draw();

    const resizeObserver = new ResizeObserver(() => {
      draw();
    });
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
    };
  }, [structures, variables]);

  return (
    <section style={boardWrapperStyle}>
      <div ref={hostRef} style={boardCanvasFrameStyle}>
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}

export interface EventLogProps {
  events: EngineEvent[];
}

const prettifyEventType = (type: EngineEvent["type"]): string =>
  type.split("_").join(" ");

export function EventLog({ events }: EventLogProps) {
  return (
    <section
      style={{
        ...cardStyle,
        marginTop: "1.5rem",
        background: "#eaf3ff"
      }}
    >
      <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#355070" }}>
        {t("board.executionFeed")}
      </div>
      <div style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
        {events.length === 0 ? (
          <span style={{ color: "#6f86a6", fontWeight: 700 }}>
            {t("board.runHint")}
          </span>
        ) : null}

        {events.map((event) => (
          <div
            key={`${event.stepId}-${event.type}-${event.structureId}`}
            style={{
              padding: "0.9rem 1rem",
              borderRadius: "18px",
              background: "#ffffff",
              border: "3px solid #d6e4fb",
              color: "#45607d",
              fontWeight: 700
            }}
          >
            {prettifyEventType(event.type)} in {event.structureId}
            {event.value !== undefined ? ` • item ${event.value}` : ""}
          </div>
        ))}
      </div>
    </section>
  );
}

export type PanelId = PlayerPanelId | EditorPanelId;
export type LayoutMode = "player" | "editor";

const screenStyle: CSSProperties = {
  width: "100%",
  height: "100dvh",
  minHeight: 0,
  padding: "1rem",
  overflow: "hidden"
};

export interface ScreenProps {
  children: ReactNode;
  mode: LayoutMode;
}

export function Screen({ children, mode }: ScreenProps) {
  return (
    <main
      style={{
        ...screenStyle,
        background: mode === "player" ? "#eef6ff" : "#f4f7fb"
      }}
    >
      {children}
    </main>
  );
}

export interface PanelProps {
  children: ReactNode;
  title?: string;
  accent?: string;
}

export function Panel({ children, title, accent = "#ffffff" }: PanelProps) {
  return (
    <section
      style={{
        border: "2px solid #cfe3f5",
        borderRadius: "24px",
        background: accent,
        padding: "1rem"
      }}
    >
      {title ? (
        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#55748b", marginBottom: "0.8rem" }}>
          {title}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export interface WorkspaceProps {
  children: ReactNode;
  columns?: string;
}

export function Workspace({ children, columns = "1fr" }: WorkspaceProps) {
  return (
    <section
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: columns
      }}
    >
      {children}
    </section>
  );
}

export interface SplitPaneProps {
  primary: ReactNode;
  secondary: ReactNode;
  asideWidth?: string;
}

export function SplitPane({
  primary,
  secondary,
  asideWidth = "320px"
}: SplitPaneProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: `minmax(0, 1fr) minmax(260px, ${asideWidth})`
      }}
    >
      {primary}
      {secondary}
    </div>
  );
}

export interface TabBarItem<T extends string> {
  id: T;
  label: string;
}

export interface TabBarProps<T extends string> {
  items: TabBarItem<T>[];
  activeId: T;
  onSelect: (id: T) => void;
}

export function TabBar<T extends string>({
  items,
  activeId,
  onSelect
}: TabBarProps<T>) {
  return (
    <nav
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        gap: "0.75rem"
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          style={{
            border: "2px solid #cfe3f5",
            borderRadius: "18px",
            padding: "0.95rem 1rem",
            background: item.id === activeId ? "#ffd36e" : "#ffffff",
            color: "#355070",
            fontWeight: 900,
            minHeight: "3.5rem"
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export interface CollapsiblePanelProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsiblePanel({
  title,
  isOpen,
  onToggle,
  children
}: CollapsiblePanelProps) {
  return (
    <section
      style={{
        border: "2px solid #cfe3f5",
        borderRadius: "22px",
        background: "#ffffff",
        overflow: "hidden"
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          border: 0,
          borderBottom: isOpen ? "2px solid #e5eff8" : "0",
          borderRadius: 0,
          background: "#f8fbff",
          padding: "1rem",
          textAlign: "left",
          fontWeight: 900,
          color: "#355070"
        }}
      >
        {title}
      </button>
      {isOpen ? <div style={{ padding: "1rem" }}>{children}</div> : null}
    </section>
  );
}

export interface LargeActionButtonProps {
  label: string;
  onClick?: () => void;
  tone?: "primary" | "secondary";
}

export function LargeActionButton({
  label,
  onClick,
  tone = "primary"
}: LargeActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "2px solid #cfe3f5",
        borderRadius: "20px",
        padding: "1rem 1.1rem",
        background: tone === "primary" ? "#ffd36e" : "#ffffff",
        color: "#355070",
        fontWeight: 900,
        minHeight: "4rem"
      }}
    >
      {label}
    </button>
  );
}

export interface BlockTileProps {
  label: string;
  tone?: string;
}

export function BlockTile({ label, tone = "#a8dcff" }: BlockTileProps) {
  return (
    <div
      style={{
        border: "2px solid #ffffff",
        borderRadius: "18px",
        background: tone,
        padding: "0.95rem 1rem",
        fontWeight: 800,
        color: "#355070"
      }}
    >
      {label}
    </div>
  );
}

export interface StepControlsProps {
  onStep: () => void;
  onRun: () => void;
  onReset: () => void;
}

export function StepControls({ onStep, onRun, onReset }: StepControlsProps) {
  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <LargeActionButton label="Step" onClick={onStep} />
      <LargeActionButton label="Run" onClick={onRun} tone="secondary" />
      <LargeActionButton label="Reset" onClick={onReset} tone="secondary" />
    </div>
  );
}

export interface PuzzleBoardProps {
  structures: StructureSnapshot[];
  handValue?: string | number | null;
  variables?: BoardVariableSnapshot[];
}

export function PuzzleBoard({ structures, variables }: PuzzleBoardProps) {
  return <StructuresBoard structures={structures} variables={variables} />;
}

export interface ExecutionTimelineProps {
  events: EngineEvent[];
}

export function ExecutionTimeline({ events }: ExecutionTimelineProps) {
  return <EventLog events={events} />;
}

export function StructurePalette() {
  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <BlockTile label="Stack" tone="#ffd36e" />
      <BlockTile label="Queue" tone="#a8dcff" />
      <BlockTile label="List" tone="#d7c3ff" />
      <BlockTile label="Transfer Block" tone="#dff4e7" />
    </div>
  );
}

export function LevelEditorCanvas() {
  return (
    <Panel title="Canvas" accent="#fffdf8">
      <div
        style={{
          minHeight: "320px",
          border: "2px dashed #d9e6f2",
          borderRadius: "20px",
          display: "grid",
          placeItems: "center",
          color: "#6c8aa3",
          fontWeight: 700
        }}
      >
        Level editor canvas stub
      </div>
    </Panel>
  );
}

export function InspectorPanel() {
  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <BlockTile label="Selected Level: Intro Transfer" tone="#ffffff" />
      <BlockTile label="Goal: Move top item from A to B" tone="#ffffff" />
      <BlockTile label="Max Steps: 2" tone="#ffffff" />
    </div>
  );
}
