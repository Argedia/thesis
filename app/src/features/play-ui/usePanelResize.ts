import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const clampLeftPaneWidth = (requestedWidth: number, containerWidth: number): number => {
  const splitterWidth = 8;
  const minPaneWidth = 360;
  const maxPaneWidth = Math.max(minPaneWidth, containerWidth - minPaneWidth - splitterWidth);
  return Math.min(Math.max(requestedWidth, minPaneWidth), maxPaneWidth);
};

export interface PanelResizeResult {
  leftPaneWidth: number | null;
  isResizingPanels: boolean;
  dualStageRef: React.RefObject<HTMLElement>;
  dualStageStyle: React.CSSProperties | undefined;
  startPanelResize: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export const usePanelResize = (isCompactLayout: boolean, viewportWidth: number): PanelResizeResult => {
  const [leftPaneWidth, setLeftPaneWidth] = useState<number | null>(null);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const dualStageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isCompactLayout) return;
    const host = dualStageRef.current;
    if (!host) return;
    const containerWidth = host.getBoundingClientRect().width;
    const ideal = Math.round(containerWidth * 0.46);
    setLeftPaneWidth((current) => clampLeftPaneWidth(current ?? ideal, containerWidth));
  }, [isCompactLayout, viewportWidth]);

  const startPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isCompactLayout || !dualStageRef.current) return;
    const host = dualStageRef.current;
    const hostRect = host.getBoundingClientRect();
    const terminalPanel = host.querySelector(".terminal-device") as HTMLElement | null;
    const initialWidth =
      leftPaneWidth ?? terminalPanel?.getBoundingClientRect().width ?? hostRect.width * 0.46;
    const startX = event.clientX;
    setIsResizingPanels(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setLeftPaneWidth(clampLeftPaneWidth(initialWidth + (moveEvent.clientX - startX), hostRect.width));
    };
    const stopResize = () => {
      setIsResizingPanels(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  };

  const dualStageStyle: React.CSSProperties | undefined =
    !isCompactLayout && leftPaneWidth
      ? { gridTemplateColumns: `${leftPaneWidth}px 8px minmax(0, 1fr)` }
      : undefined;

  return { leftPaneWidth, isResizingPanels, dualStageRef, dualStageStyle, startPanelResize };
};
