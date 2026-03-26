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

export const calculateDropIndex = (
  pointerX: number,
  pointerY: number,
  editorRect: DOMRect | undefined,
  blockRects: Array<{ id: string; rect: DOMRect }>,
  blockCount: number
): { index: number; isOverEditor: boolean } => {
  if (!editorRect) {
    return { index: blockCount, isOverEditor: false };
  }

  const nearThreshold = 56;
  const isOverEditor =
    pointerX >= editorRect.left - nearThreshold &&
    pointerX <= editorRect.right + nearThreshold &&
    pointerY >= editorRect.top - nearThreshold &&
    pointerY <= editorRect.bottom + nearThreshold;

  let nextIndex = blockCount;
  for (let index = 0; index < blockRects.length; index += 1) {
    const { rect } = blockRects[index];
    if (pointerY < rect.top + rect.height / 2) {
      nextIndex = index;
      break;
    }
  }

  return { index: nextIndex, isOverEditor };
};

export const wheelTransform = (index: number, totalOptions: number): string => {
  const total = Math.max(totalOptions - 1, 1);
  const angle = -75 + (150 / total) * index;
  const radius = 88;
  const x = 26 + Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;
  return `translate(${x}px, ${y}px) translate(-50%, -50%)`;
};
