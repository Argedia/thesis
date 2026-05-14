import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const DEFAULT_LEFT_PANE_RATIO = 0.75;

const clampLeftPaneWidth = (requestedWidth: number, containerWidth: number): number => {
  const splitterWidth = 8;
  const minLeftPaneWidth = 360;
  const minRightPaneWidth = 240;
  const maxPaneWidth = Math.max(minLeftPaneWidth, containerWidth - minRightPaneWidth - splitterWidth);
  return Math.min(Math.max(requestedWidth, minLeftPaneWidth), maxPaneWidth);
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
  const hasUserResizedRef = useRef(false);

  useEffect(() => {
    if (isCompactLayout) {
      hasUserResizedRef.current = false;
      setLeftPaneWidth(null);
      return;
    }
    const host = dualStageRef.current;
    if (!host) return;

    const applyDefaultOrClamp = () => {
      const containerWidth = host.getBoundingClientRect().width;
      if (containerWidth <= 0) return;
      const ideal = Math.round(containerWidth * DEFAULT_LEFT_PANE_RATIO);
      setLeftPaneWidth((current) => {
        const target = hasUserResizedRef.current
          ? clampLeftPaneWidth(current ?? ideal, containerWidth)
          : clampLeftPaneWidth(ideal, containerWidth);
        return current === target ? current : target;
      });
    };

    applyDefaultOrClamp();
    const observer = new ResizeObserver(applyDefaultOrClamp);
    observer.observe(host);

    return () => observer.disconnect();
  }, [isCompactLayout, viewportWidth]);

  const startPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isCompactLayout || !dualStageRef.current) return;
    const host = dualStageRef.current;
    const hostRect = host.getBoundingClientRect();
    const terminalPanel = host.querySelector(".terminal-device") as HTMLElement | null;
    const initialWidth =
      leftPaneWidth ?? terminalPanel?.getBoundingClientRect().width ?? hostRect.width * DEFAULT_LEFT_PANE_RATIO;
    hasUserResizedRef.current = true;
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
