export const insertAt = <T,>(items: T[], index: number, item: T): T[] => {
  const next = [...items];
  next.splice(index, 0, item);
  return next;
};

export const moveItem = <T extends { id: string }>(
  items: T[],
  movingId: string,
  targetIndex: number
): T[] => {
  const movingIndex = items.findIndex((item) => item.id === movingId);
  if (movingIndex === -1) {
    return items;
  }

  const movingItem = items[movingIndex];
  const next = items.filter((item) => item.id !== movingId);
  const adjustedIndex = targetIndex > movingIndex ? targetIndex - 1 : targetIndex;
  return insertAt(next, Math.min(adjustedIndex, next.length), movingItem);
};

export interface DragGeometry {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  placementX: number;
  placementY: number;
}

export const calculateDropIndex = (
  drag: DragGeometry,
  editorRect: DOMRect | undefined,
  blockRects: Array<{ id: string; rect: DOMRect }>,
  blockCount: number,
  previousIndex?: number | null
): { index: number; isOverEditor: boolean } => {
  if (!editorRect) {
    return { index: blockCount, isOverEditor: false };
  }

  const nearThreshold = 56;
  const isOverEditor =
    drag.right >= editorRect.left - nearThreshold &&
    drag.left <= editorRect.right + nearThreshold &&
    drag.bottom >= editorRect.top - nearThreshold &&
    drag.top <= editorRect.bottom + nearThreshold;

  if (blockRects.length === 0) {
    return { index: blockCount, isOverEditor };
  }

  const anchors = blockRects.map(({ rect }) => rect.top + Math.max(rect.height, 1) / 2);
  const leaveTolerance = 20;

  if (previousIndex !== null && previousIndex !== undefined && previousIndex >= 0 && previousIndex < anchors.length) {
    const currentAnchor = anchors[previousIndex];
    const upperBoundary =
      previousIndex === 0 ? editorRect.top : (anchors[previousIndex - 1] + currentAnchor) / 2;
    const lowerBoundary =
      previousIndex === anchors.length - 1
        ? editorRect.bottom
        : (currentAnchor + anchors[previousIndex + 1]) / 2;

    if (
      drag.placementY >= upperBoundary - leaveTolerance &&
      drag.placementY <= lowerBoundary + leaveTolerance
    ) {
      return { index: previousIndex, isOverEditor };
    }
  }

  let nextIndex = blockCount;
  let bestDistance = Number.POSITIVE_INFINITY;
  anchors.forEach((anchor, index) => {
    const distance = Math.abs(drag.placementY - anchor);
    if (distance < bestDistance) {
      bestDistance = distance;
      nextIndex = index;
    }
  });

  return { index: nextIndex, isOverEditor };
};

export interface WheelTransformOptions {
  angleStart?: number;
  angleEnd?: number;
  radius?: number;
  baseX?: number;
}

export interface WheelLayout {
  angleStart: number;
  angleEnd: number;
  radius: number;
  baseX: number;
  width: number;
  height: number;
  buttonMinWidth: number;
  buttonPaddingX: number;
  buttonPaddingY: number;
  buttonFontSize: number;
  buttonBorderRadius: number;
}

export const computeWheelLayout = (labels: string[]): WheelLayout => {
  const totalOptions = labels.length;
  const dense = totalOptions > 10;
  const medium = totalOptions > 6;
  const angleStart = dense ? -86 : medium ? -82 : -75;
  const angleEnd = dense ? 86 : medium ? 82 : 75;
  const buttonMinWidth = dense ? 52 : medium ? 64 : 112;
  const buttonPaddingX = dense ? 8 : medium ? 10 : 13;
  const buttonPaddingY = dense ? 6 : medium ? 8 : 11;
  const buttonFontSize = dense ? 11.5 : medium ? 12.5 : 13.5;
  const buttonBorderRadius = dense ? 16 : 18;
  const buttonHeight = buttonFontSize + buttonPaddingY * 2 + 4;
  const widestLabel = labels.reduce((max, label) => Math.max(max, label.length), 1);
  const estimatedButtonWidth = Math.max(
    buttonMinWidth,
    Math.ceil(widestLabel * buttonFontSize * 0.72 + buttonPaddingX * 2 + 8)
  );
  const spanRadians = ((angleEnd - angleStart) * Math.PI) / 180;
  const desiredGap = Math.max(
    dense ? buttonHeight * 1.05 : medium ? buttonHeight * 1.1 : buttonHeight * 1.14,
    estimatedButtonWidth * (dense ? 0.78 : medium ? 0.72 : 0.6)
  );
  const radius = Math.max(
    dense ? 148 : medium ? 116 : 88,
    Math.ceil((desiredGap * Math.max(totalOptions - 1, 1)) / Math.max(spanRadians, 0.1))
  );
  const buttonHalfWidth = estimatedButtonWidth / 2;
  const buttonHalfHeight = buttonHeight / 2;
  const baseX = buttonHalfWidth + 8;
  const width = Math.ceil(baseX + radius + buttonHalfWidth + 14);
  const height = Math.ceil(
    2 * (Math.sin((Math.max(Math.abs(angleStart), Math.abs(angleEnd)) * Math.PI) / 180) * radius + buttonHalfHeight + 12)
  );

  return {
    angleStart,
    angleEnd,
    radius,
    baseX,
    width,
    height,
    buttonMinWidth,
    buttonPaddingX,
    buttonPaddingY,
    buttonFontSize,
    buttonBorderRadius
  };
};

export const wheelTransform = (
  index: number,
  totalOptions: number,
  options: WheelTransformOptions = {}
): string => {
  const total = Math.max(totalOptions - 1, 1);
  const angleStart = options.angleStart ?? -75;
  const angleEnd = options.angleEnd ?? 75;
  const angle = angleStart + ((angleEnd - angleStart) / total) * index;
  const radius =
    options.radius ?? (totalOptions > 10 ? 112 : totalOptions > 6 ? 98 : 88);
  const baseX = options.baseX ?? (totalOptions > 10 ? 34 : totalOptions > 6 ? 30 : 26);
  const x = baseX + Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;
  return `translate(${x}px, ${y}px) translate(-50%, -50%)`;
};
