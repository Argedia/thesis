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

export interface BoardHeapObjectSnapshot {
  heapId: string;
  typeName: string;
  fields: Array<{
    name: string;
    displayValue: string | number | boolean;
    isRef: boolean;
    refHeapId?: string;
  }>;
}

export interface StructuresBoardProps {
  structures: StructureSnapshot[];
  handValue?: string | number | null;
  variables?: BoardVariableSnapshot[];
  heapObjects?: BoardHeapObjectSnapshot[];
  showStructureConfigActions?: boolean;
  onStructureConfigClick?: (payload: StructureConfigClickPayload) => void;
}

export interface StructureConfigClickPayload {
  structureId: string;
  clientX: number;
  clientY: number;
}

export interface BoardVariableSnapshot {
  id: string;
  name: string;
  scope: string;
  valueKind: "primitive" | "pointer" | "typed-object" | "routine-reference" | "routine-object";
  displayValue: string | number | boolean;
  declaredTypeRef?:
    | { kind: "primitive"; primitive: "text" | "boolean" | "value" }
    | { kind: "structure"; structureKind: "stack" | "queue" | "list" }
    | { kind: "user"; typeRoutineId: string }
    | null;
  objectFields?: Array<{
    name: string;
    displayValue: string | number | boolean;
  }>;
  referenceTargetId?: string;
  referenceTargetName?: string;
  heapRefId?: string;
}

const t = (key: string, options?: Record<string, unknown>) =>
  i18next.t(key, options) as string;

const boardWrapperStyle: CSSProperties = {
  ...cardStyle,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
  padding: "0.75rem",
  background: "#f7fbff"
};

const boardCanvasFrameStyle: CSSProperties = {
  flex: "1 1 auto",
  width: "100%",
  height: "100%",
  minHeight: 0,
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

export function StructuresBoard({
  structures,
  variables = [],
  heapObjects = [],
  showStructureConfigActions = false,
  onStructureConfigClick
}: StructuresBoardProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const structureConfigHitboxesRef = useRef<
    Array<{ id: string; x: number; y: number; width: number; height: number }>
  >([]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) {
      return;
    }

    const draw = () => {
      const normalizedStructures = structures.map((structure) => normalizeStructureSnapshot(structure));
      const width = Math.max(host.clientWidth, 320);
      const availableHeight = Math.max(host.clientHeight, 360);

      // --- main grid (structures + variables) ---
      const mainCardCount = normalizedStructures.length + variables.length;
      const baseHorizontalPadding = width < 520 ? 10 : width < 900 ? 14 : 22;
      const baseVerticalPadding = width < 520 ? 10 : width < 900 ? 14 : 20;
      const baseGutter = width < 520 ? 10 : width < 900 ? 16 : 24;
      const minCardWidth = width < 520 ? 220 : 300;
      const columns = Math.max(
        1,
        Math.min(2, Math.floor((width - baseHorizontalPadding * 2 + baseGutter) / (minCardWidth + baseGutter)))
      );
      const rowCount = Math.max(1, Math.ceil(mainCardCount / columns));
      const cellWidth = (width - baseHorizontalPadding * 2 - baseGutter * (columns - 1)) / columns;
      const naturalCellHeight = Math.max(176, Math.min(220, Math.round(148 + cellWidth * 0.18)));

      // --- heap strip layout ---
      const heapCardW = Math.max(110, Math.round(width < 520 ? 100 : 130));
      const heapCardH = 52;
      const heapGutter = 6;
      const heapPad = baseHorizontalPadding;
      const heapCols = Math.max(1, Math.floor((width - heapPad * 2 + heapGutter) / (heapCardW + heapGutter)));
      const heapRows = heapObjects.length > 0 ? Math.ceil(heapObjects.length / heapCols) : 0;
      const heapStripH = heapRows > 0 ? heapRows * heapCardH + (heapRows - 1) * heapGutter + heapGutter * 2 : 0;

      const naturalContentHeight =
        baseVerticalPadding * 2 + rowCount * naturalCellHeight + baseGutter * (rowCount - 1) + heapStripH;
      const fitScale =
        naturalContentHeight > availableHeight ? availableHeight / naturalContentHeight : 1;
      const layoutScale = Math.max(0.58, Math.min(1, cellWidth / 420, fitScale));
      const horizontalPadding = Math.max(8, Math.round(baseHorizontalPadding * layoutScale));
      const verticalPadding = Math.max(8, Math.round(baseVerticalPadding * layoutScale));
      const gutter = Math.max(8, Math.round(baseGutter * layoutScale));
      const cellHeight = Math.max(132, Math.round(naturalCellHeight * layoutScale));
      const mainContentHeight =
        verticalPadding * 2 + rowCount * cellHeight + gutter * (rowCount - 1);
      const contentHeight = mainContentHeight + heapStripH;
      const height = Math.max(Math.min(availableHeight, Math.max(contentHeight, 220)), 220);
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
      const gridStep = Math.max(28, Math.round(40 * layoutScale));
      const gridOffset = Math.max(12, Math.round(20 * layoutScale));
      for (let x = gridOffset; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = gridOffset; y < height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const structureConfigHitboxes: Array<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      normalizedStructures.forEach((structure, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const frameX = horizontalPadding + column * (cellWidth + gutter);
        const frameY = verticalPadding + row * (cellHeight + gutter);
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
        drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, Math.round(26 * layoutScale));
        ctx.fill();
        ctx.strokeStyle = "#d3e4f4";
        ctx.lineWidth = 2;
        ctx.stroke();

        const labelFont = Math.max(10, Math.round(13 * layoutScale));
        const titleFont = Math.max(22, Math.round(30 * layoutScale));
        const metaFont = Math.max(11, Math.round(14 * layoutScale));
        ctx.font = `800 ${labelFont}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = labelColor;
        ctx.fillText(
          t(`structures.${structure.kind}`).toUpperCase(),
          frameX + Math.round(20 * layoutScale),
          frameY + Math.round(24 * layoutScale)
        );

        ctx.font = `900 ${titleFont}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = "#355070";
        ctx.fillText(
          structure.id,
          frameX + Math.round(18 * layoutScale),
          frameY + Math.round(58 * layoutScale)
        );

        ctx.font = `700 ${metaFont}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = "#6d8297";
        ctx.textAlign = "right";
        ctx.fillText(
          `${structure.values.length} ${t("common.items")}`,
          frameX + frameWidth - Math.round(18 * layoutScale),
          frameY + Math.round(24 * layoutScale)
        );
        ctx.textAlign = "start";

        if (showStructureConfigActions) {
          const actionWidth = Math.max(24, Math.round(28 * layoutScale));
          const actionHeight = Math.max(24, Math.round(28 * layoutScale));
          const actionX = frameX + Math.round(14 * layoutScale);
          const actionY = frameY + frameHeight - actionHeight - Math.round(12 * layoutScale);

          ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
          drawRoundedRect(ctx, actionX, actionY, actionWidth, actionHeight, Math.max(6, Math.round(8 * layoutScale)));
          ctx.fill();
          ctx.strokeStyle = "rgba(158, 197, 229, 0.82)";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = "#355070";
          ctx.font = `900 ${Math.max(13, Math.round(16 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("⚙", actionX + actionWidth / 2, actionY + actionHeight * 0.68);
          ctx.textAlign = "start";

          structureConfigHitboxes.push({
            id: structure.id,
            x: actionX,
            y: actionY,
            width: actionWidth,
            height: actionHeight
          });
        }

        if (structure.kind === "stack") {
          const slotWidth = Math.min(Math.round(120 * layoutScale), frameWidth * 0.34);
          const slotHeight = Math.max(24, Math.round(34 * layoutScale));
          const towerX = frameX + frameWidth * 0.5 - slotWidth * 0.5;
          const baseY = frameY + frameHeight - Math.round(22 * layoutScale);
          const topY = frameY + Math.round(76 * layoutScale);

          ctx.strokeStyle = "#7b93ab";
          ctx.lineWidth = Math.max(3, Math.round(5 * layoutScale));
          ctx.beginPath();
          ctx.moveTo(towerX, topY);
          ctx.lineTo(towerX, baseY);
          ctx.moveTo(towerX + slotWidth, topY);
          ctx.lineTo(towerX + slotWidth, baseY);
          ctx.moveTo(towerX - Math.round(10 * layoutScale), baseY);
          ctx.lineTo(towerX + slotWidth + Math.round(10 * layoutScale), baseY);
          ctx.stroke();

          structure.values.forEach((node, valueIndex) => {
            const itemY = baseY - slotHeight - valueIndex * (slotHeight + Math.round(6 * layoutScale));
            const item = node as DataNode;
            ctx.fillStyle = item.color ?? structureColor;
            drawRoundedRect(
              ctx,
              towerX + Math.round(8 * layoutScale),
              itemY,
              slotWidth - Math.round(16 * layoutScale),
              slotHeight,
              Math.max(8, Math.round(10 * layoutScale))
            );
            ctx.fill();
            ctx.strokeStyle = "rgba(53, 80, 112, 0.18)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#355070";
            ctx.font = `800 ${Math.max(11, Math.round(14 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(
              String(item.value),
              towerX + slotWidth / 2,
              itemY + Math.round(slotHeight * 0.66)
            );
            ctx.textAlign = "start";
          });
        } else if (structure.kind === "queue") {
          const itemWidth = Math.max(36, Math.round(58 * layoutScale));
          const itemHeight = itemWidth;
          const laneX = frameX + Math.round(20 * layoutScale);
          const laneY = frameY + Math.round(122 * layoutScale);
          const startX = frameX + Math.round(28 * layoutScale);
          const maxVisible = Math.max(
            1,
            Math.floor((frameWidth - Math.round(56 * layoutScale)) / (itemWidth + Math.round(8 * layoutScale)))
          );

          ctx.strokeStyle = "#7b93ab";
          ctx.lineWidth = Math.max(3, Math.round(5 * layoutScale));
          ctx.beginPath();
          ctx.moveTo(laneX, laneY);
          ctx.lineTo(frameX + frameWidth - Math.round(20 * layoutScale), laneY);
          ctx.stroke();

          structure.values.slice(0, maxVisible).forEach((node, valueIndex) => {
            const itemX = startX + valueIndex * (itemWidth + Math.round(8 * layoutScale));
            const itemY = laneY - itemHeight - Math.round(8 * layoutScale);
            const item = node as DataNode;
            ctx.fillStyle = item.color ?? structureColor;
            drawRoundedRect(ctx, itemX, itemY, itemWidth, itemHeight, Math.max(8, Math.round(12 * layoutScale)));
            ctx.fill();
            ctx.strokeStyle = "rgba(53, 80, 112, 0.18)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#355070";
            ctx.font = `800 ${Math.max(12, Math.round(16 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(
              String(item.value),
              itemX + itemWidth / 2,
              itemY + Math.round(itemHeight * 0.62)
            );
            ctx.textAlign = "start";
          });

          if (structure.values.length > maxVisible) {
            ctx.fillStyle = "#6d8297";
            ctx.font = `700 ${Math.max(11, Math.round(14 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
            ctx.fillText(
              `+${structure.values.length - maxVisible}`,
              frameX + frameWidth - Math.round(54 * layoutScale),
              frameY + Math.round(96 * layoutScale)
            );
          }
        } else {
          const itemWidth = Math.max(36, Math.round(58 * layoutScale));
          const itemHeight = Math.max(28, Math.round(42 * layoutScale));
          const laneX = frameX + Math.round(26 * layoutScale);
          const laneY = frameY + Math.round(126 * layoutScale);
          const startX = frameX + Math.round(30 * layoutScale);
          const maxVisible = Math.max(
            1,
            Math.floor((frameWidth - Math.round(60 * layoutScale)) / (itemWidth + Math.round(16 * layoutScale)))
          );

          ctx.strokeStyle = "#8e79c2";
          ctx.lineWidth = Math.max(2, Math.round(4 * layoutScale));
          ctx.beginPath();
          ctx.moveTo(laneX, laneY);
          ctx.lineTo(frameX + frameWidth - Math.round(24 * layoutScale), laneY);
          ctx.stroke();

          structure.values.slice(0, maxVisible).forEach((node, valueIndex) => {
            const itemX = startX + valueIndex * (itemWidth + Math.round(16 * layoutScale));
            const itemY = laneY - itemHeight - Math.round(10 * layoutScale);
            const item = node as DataNode;

            if (valueIndex > 0) {
              ctx.strokeStyle = "rgba(124, 82, 186, 0.45)";
              ctx.lineWidth = Math.max(2, Math.round(3 * layoutScale));
              ctx.beginPath();
              ctx.moveTo(itemX - Math.round(14 * layoutScale), itemY + itemHeight / 2);
              ctx.lineTo(itemX - Math.round(4 * layoutScale), itemY + itemHeight / 2);
              ctx.stroke();
            }

            ctx.fillStyle = item.color ?? structureColor;
            drawRoundedRect(ctx, itemX, itemY, itemWidth, itemHeight, Math.max(8, Math.round(12 * layoutScale)));
            ctx.fill();
            ctx.strokeStyle = "rgba(53, 80, 112, 0.18)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#355070";
            ctx.font = `800 ${Math.max(11, Math.round(15 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(
              String(item.value),
              itemX + itemWidth / 2,
              itemY + Math.round(itemHeight * 0.64)
            );
            ctx.textAlign = "start";
          });

          if (structure.values.length > maxVisible) {
            ctx.fillStyle = "#6d8297";
            ctx.font = `700 ${Math.max(11, Math.round(14 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
            ctx.fillText(
              `+${structure.values.length - maxVisible}`,
              frameX + frameWidth - Math.round(54 * layoutScale),
              frameY + Math.round(96 * layoutScale)
            );
          }
        }

        if (structure.values.length === 0) {
          ctx.fillStyle = "#9eb0bf";
          ctx.font = `700 ${Math.max(11, Math.round(15 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(
            t("common.empty"),
            frameX + frameWidth / 2,
            frameY + frameHeight / 2 + Math.round(18 * layoutScale)
          );
          ctx.textAlign = "start";
        }
      });

      const variableAnchors = new Map<
        string,
        { leftX: number; rightX: number; midY: number }
      >();

      variables.forEach((variable, variableIndex) => {
        const index = normalizedStructures.length + variableIndex;
        const column = index % columns;
        const row = Math.floor(index / columns);
        const frameX = horizontalPadding + column * (cellWidth + gutter);
        const frameY = verticalPadding + row * (cellHeight + gutter);
        const frameWidth = cellWidth;
        const frameHeight = cellHeight;
        const accent =
          variable.valueKind === "pointer"
            ? "#a58ad5"
            : variable.valueKind === "typed-object"
              ? "#ecb76f"
              : variable.valueKind === "routine-reference"
                ? "#80a8dd"
                : "#7fbd98";

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, Math.round(26 * layoutScale));
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = `800 ${Math.max(10, Math.round(13 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = accent;
        ctx.fillText(
          t("common.variables").toUpperCase(),
          frameX + Math.round(20 * layoutScale),
          frameY + Math.round(24 * layoutScale)
        );

        ctx.font = `900 ${Math.max(18, Math.round(28 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = "#355070";
        ctx.fillText(variable.name, frameX + Math.round(18 * layoutScale), frameY + Math.round(58 * layoutScale));

        const typeLabel =
          variable.declaredTypeRef?.kind === "primitive"
            ? variable.declaredTypeRef.primitive.toUpperCase()
            : variable.declaredTypeRef?.kind === "structure"
              ? variable.declaredTypeRef.structureKind.toUpperCase()
              : variable.declaredTypeRef?.kind === "user"
                ? t("blocks.type").toUpperCase()
                : t("blocks.value").toUpperCase();
        ctx.font = `700 ${Math.max(10, Math.round(12 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = "#6d8297";
        ctx.fillText(typeLabel, frameX + Math.round(20 * layoutScale), frameY + Math.round(78 * layoutScale));

        ctx.font = `800 ${Math.max(10, Math.round(13 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = "#355070";
        ctx.fillText(`${variable.scope}`, frameX + Math.round(20 * layoutScale), frameY + Math.round(98 * layoutScale));

        ctx.fillStyle = "#edf5ff";
        drawRoundedRect(
          ctx,
          frameX + Math.round(20 * layoutScale),
          frameY + Math.round(108 * layoutScale),
          frameWidth - Math.round(40 * layoutScale),
          Math.max(22, Math.round(28 * layoutScale)),
          Math.max(8, Math.round(12 * layoutScale))
        );
        ctx.fill();
        ctx.fillStyle = "#355070";
        ctx.font = `800 ${Math.max(10, Math.round(13 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillText(
          String(variable.displayValue),
          frameX + Math.round(30 * layoutScale),
          frameY + Math.round(126 * layoutScale)
        );

        if (variable.objectFields && variable.objectFields.length > 0) {
          const maxFields = Math.min(variable.objectFields.length, 3);
          for (let fieldIndex = 0; fieldIndex < maxFields; fieldIndex += 1) {
            const field = variable.objectFields[fieldIndex]!;
            const itemY = frameY + Math.round(144 * layoutScale) + fieldIndex * Math.round(18 * layoutScale);
            ctx.fillStyle = "#f6f9ff";
            drawRoundedRect(
              ctx,
              frameX + Math.round(20 * layoutScale),
              itemY,
              frameWidth - Math.round(40 * layoutScale),
              Math.max(12, Math.round(16 * layoutScale)),
              Math.max(6, Math.round(8 * layoutScale))
            );
            ctx.fill();
            ctx.font = `700 ${Math.max(9, Math.round(11 * layoutScale))}px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
            ctx.fillStyle = "#4f79b6";
            ctx.textAlign = "start";
            ctx.fillText(field.name, frameX + Math.round(28 * layoutScale), itemY + Math.round(12 * layoutScale));
            ctx.textAlign = "right";
            ctx.fillText(
              String(field.displayValue),
              frameX + frameWidth - Math.round(30 * layoutScale),
              itemY + Math.round(12 * layoutScale)
            );
            ctx.textAlign = "start";
          }
        }

        variableAnchors.set(variable.id, {
          leftX: frameX + 6,
          rightX: frameX + frameWidth - 6,
          midY: frameY + frameHeight * 0.5
        });
      });

      variables.forEach((variable) => {
        if (variable.valueKind !== "pointer" || !variable.referenceTargetId) {
          return;
        }
        const source = variableAnchors.get(variable.id);
        const target = variableAnchors.get(variable.referenceTargetId);
        if (!source || !target) {
          return;
        }
        const startX = source.rightX;
        const endX = target.leftX;
        const startY = source.midY;
        const endY = target.midY;
        const controlOffset = Math.max(26, Math.abs(endX - startX) * 0.32);
        ctx.strokeStyle = "#8c74c8";
        ctx.lineWidth = Math.max(1.5, Math.round(2 * layoutScale));
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(
          startX + controlOffset,
          startY,
          endX - controlOffset,
          endY,
          endX,
          endY
        );
        ctx.stroke();

        const arrowX = endX;
        const arrowY = endY;
        ctx.fillStyle = "#8c74c8";
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - Math.round(8 * layoutScale), arrowY - Math.round(5 * layoutScale));
        ctx.lineTo(arrowX - Math.round(8 * layoutScale), arrowY + Math.round(5 * layoutScale));
        ctx.closePath();
        ctx.fill();
      });

      const heapAnchors = new Map<string, { leftX: number; rightX: number; midY: number }>();

      // heap strip starts below main grid
      const heapStripTop = mainContentHeight;

      if (heapObjects.length > 0) {
        // section label
        ctx.font = `800 10px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = "#c07020";
        ctx.fillText("HEAP", heapPad, heapStripTop + 13);
      }

      heapObjects.forEach((obj, heapIndex) => {
        const hCol = heapIndex % heapCols;
        const hRow = Math.floor(heapIndex / heapCols);
        const frameX = heapPad + hCol * (heapCardW + heapGutter);
        const frameY = heapStripTop + heapGutter + hRow * (heapCardH + heapGutter);
        const frameWidth = heapCardW;
        const frameHeight = heapCardH;

        ctx.fillStyle = "rgba(255, 245, 225, 0.97)";
        drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, 8);
        ctx.fill();
        ctx.strokeStyle = "#d4821e";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // type name
        ctx.font = `800 11px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = "#7a4010";
        ctx.textAlign = "start";
        ctx.fillText(obj.typeName, frameX + 7, frameY + 14);

        // short id
        ctx.font = `600 9px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
        ctx.fillStyle = "#b08050";
        ctx.textAlign = "right";
        ctx.fillText(`#${obj.heapId.slice(0, 6)}`, frameX + frameWidth - 5, frameY + 14);
        ctx.textAlign = "start";

        // fields — one per line, compact
        const maxFields = Math.min(obj.fields.length, 3);
        for (let fi = 0; fi < maxFields; fi += 1) {
          const field = obj.fields[fi]!;
          const fy = frameY + 24 + fi * 11;
          ctx.font = `700 9px Trebuchet MS, Arial Rounded MT Bold, sans-serif`;
          ctx.fillStyle = field.isRef ? "#b06a10" : "#4f6a8a";
          ctx.textAlign = "start";
          ctx.fillText(`${field.name}:`, frameX + 7, fy);
          ctx.textAlign = "right";
          ctx.fillText(
            field.isRef ? `→#${String(field.refHeapId ?? "").slice(0, 6)}` : String(field.displayValue),
            frameX + frameWidth - 5,
            fy
          );
          ctx.textAlign = "start";
        }

        heapAnchors.set(obj.heapId, {
          leftX: frameX,
          rightX: frameX + frameWidth,
          midY: frameY + frameHeight * 0.5
        });
      });

      const drawArrow = (
        startX: number, startY: number, endX: number, endY: number, color: string
      ) => {
        const controlOffset = Math.max(26, Math.abs(endX - startX) * 0.32);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, Math.round(2 * layoutScale));
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + controlOffset, startY, endX - controlOffset, endY, endX, endY);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - Math.round(8 * layoutScale), endY - Math.round(5 * layoutScale));
        ctx.lineTo(endX - Math.round(8 * layoutScale), endY + Math.round(5 * layoutScale));
        ctx.closePath();
        ctx.fill();
      };

      variables.forEach((variable) => {
        if (variable.valueKind !== "typed-object" || !variable.heapRefId) return;
        const source = variableAnchors.get(variable.id);
        const target = heapAnchors.get(variable.heapRefId);
        if (!source || !target) return;
        drawArrow(source.rightX, source.midY, target.leftX, target.midY, "#e08c3a");
      });

      heapObjects.forEach((obj) => {
        const source = heapAnchors.get(obj.heapId);
        if (!source) return;
        obj.fields.forEach((field) => {
          if (!field.isRef || !field.refHeapId) return;
          const target = heapAnchors.get(field.refHeapId);
          if (!target) return;
          drawArrow(source.rightX, source.midY + Math.round(10 * layoutScale), target.leftX, target.midY - Math.round(10 * layoutScale), "#c07830");
        });
      });

      structureConfigHitboxesRef.current = structureConfigHitboxes;
    };

    draw();

    const resizeObserver = new ResizeObserver(() => {
      draw();
    });
    resizeObserver.observe(host);

    const handleViewportResize = () => {
      draw();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!onStructureConfigClick || !showStructureConfigActions) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hitbox = structureConfigHitboxesRef.current.find(
        (item) =>
          x >= item.x &&
          x <= item.x + item.width &&
          y >= item.y &&
          y <= item.y + item.height
      );
      if (!hitbox) {
        return;
      }
      event.preventDefault();
      onStructureConfigClick({
        structureId: hitbox.id,
        clientX: event.clientX,
        clientY: event.clientY
      });
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!showStructureConfigActions) {
        canvas.style.cursor = "default";
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = structureConfigHitboxesRef.current.some(
        (item) =>
          x >= item.x &&
          x <= item.x + item.width &&
          y >= item.y &&
          y <= item.y + item.height
      );
      canvas.style.cursor = hit ? "pointer" : "default";
    };
    window.addEventListener("resize", handleViewportResize);
    window.visualViewport?.addEventListener("resize", handleViewportResize);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    const animationFrame = window.requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleViewportResize);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.style.cursor = "default";
      window.cancelAnimationFrame(animationFrame);
    };
  }, [onStructureConfigClick, showStructureConfigActions, structures, variables, heapObjects]);

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
  heapObjects?: BoardHeapObjectSnapshot[];
  showStructureConfigActions?: boolean;
  onStructureConfigClick?: (payload: StructureConfigClickPayload) => void;
}

export function PuzzleBoard({
  structures,
  variables,
  heapObjects,
  showStructureConfigActions,
  onStructureConfigClick
}: PuzzleBoardProps) {
  return (
    <StructuresBoard
      structures={structures}
      variables={variables}
      heapObjects={heapObjects}
      showStructureConfigActions={showStructureConfigActions}
      onStructureConfigClick={onStructureConfigClick}
    />
  );
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
