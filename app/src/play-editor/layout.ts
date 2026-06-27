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
  pointerY: number;
}

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
  const angleStart = dense ? -84 : medium ? -78 : -72;
  const angleEnd = dense ? 84 : medium ? 78 : 72;
  const buttonMinWidth = dense ? 52 : medium ? 60 : 104;
  const buttonPaddingX = dense ? 8 : medium ? 10 : 13;
  const buttonPaddingY = dense ? 6 : medium ? 8 : 11;
  const buttonFontSize = dense ? 11.5 : medium ? 12.5 : 13.5;
  const buttonBorderRadius = dense ? 16 : 18;
  const buttonHeight = buttonFontSize + buttonPaddingY * 2 + 4;
  const estimatedButtonWidths = labels.map((label) =>
    Math.max(buttonMinWidth, Math.ceil(label.length * buttonFontSize * 0.72 + buttonPaddingX * 2 + 8))
  );
  const widestButtonWidth = estimatedButtonWidths.reduce((max, width) => Math.max(max, width), buttonMinWidth);
  const averageButtonWidth =
    estimatedButtonWidths.reduce((sum, width) => sum + width, 0) / Math.max(estimatedButtonWidths.length, 1);
  const spanRadians = ((angleEnd - angleStart) * Math.PI) / 180;
  const desiredGap = Math.max(
    dense ? buttonHeight * 1.02 : medium ? buttonHeight * 1.06 : buttonHeight * 1.1,
    averageButtonWidth * (dense ? 0.56 : medium ? 0.62 : 0.58),
    widestButtonWidth * (dense ? 0.36 : medium ? 0.42 : 0.48)
  );
  const radius = Math.max(
    dense ? 124 : medium ? 96 : 82,
    Math.ceil((desiredGap * Math.max(totalOptions - 1, 1)) / Math.max(spanRadians, 0.1))
  );
  const buttonHalfWidth = widestButtonWidth / 2;
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
