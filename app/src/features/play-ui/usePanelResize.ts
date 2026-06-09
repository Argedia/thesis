import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const DEFAULT_LEFT_PANE_RATIO = 0.75;

const clampLeftPaneWidth = (requestedWidth: number, containerWidth: number): number => {
  const splitterWidth = 8;
  const minLeftPaneWidth = 360;
  const minRightPaneWidth = 240;
  const maxPaneWidth = Math.max(minLeftPaneWidth, containerWidth - minRightPaneWidth - splitterWidth);
  return Math.min(Math.max(requestedWidth, minLeftPaneWidth), maxPaneWidth);
};

const loadSavedRatio = (storageKey: string): number | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const value = parseFloat(raw);
    return isFinite(value) && value > 0 && value < 1 ? value : null;
  } catch {
    return null;
  }
};

const saveRatio = (storageKey: string, width: number, containerWidth: number): void => {
  if (containerWidth <= 0) return;
  try {
    localStorage.setItem(storageKey, String(width / containerWidth));
  } catch {
    // storage unavailable
  }
};

export interface PanelResizeResult {
  leftPaneWidth: number | null;
  isResizingPanels: boolean;
  dualStageRef: React.RefCallback<HTMLElement>;
  dualStageStyle: React.CSSProperties | undefined;
  startPanelResize: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export const usePanelResize = (isCompactLayout: boolean, viewportWidth: number, storageKey = "panel-split-ratio"): PanelResizeResult => {
  const [leftPaneWidth, setLeftPaneWidth] = useState<number | null>(null);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const hostRef = useRef<HTMLElement | null>(null);
  const hasUserResizedRef = useRef(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;
  const isCompactRef = useRef(isCompactLayout);
  isCompactRef.current = isCompactLayout;

  const applyLayout = useCallback((host: HTMLElement) => {
    const containerWidth = host.getBoundingClientRect().width;
    if (containerWidth <= 0) return;
    const savedRatio = loadSavedRatio(storageKeyRef.current);
    const ratio = savedRatio ?? DEFAULT_LEFT_PANE_RATIO;
    const ideal = Math.round(containerWidth * ratio);
    setLeftPaneWidth((current) => {
      const target = hasUserResizedRef.current
        ? clampLeftPaneWidth(current ?? ideal, containerWidth)
        : clampLeftPaneWidth(ideal, containerWidth);
      return current === target ? current : target;
    });
  }, []);

  const dualStageRef: React.RefCallback<HTMLElement> = useCallback((el: HTMLElement | null) => {
    // Disconnect previous observer
    observerRef.current?.disconnect();
    observerRef.current = null;
    hostRef.current = el;

    if (!el || isCompactRef.current) return;

    applyLayout(el);
    const observer = new ResizeObserver(() => applyLayout(el));
    observer.observe(el);
    observerRef.current = observer;
  }, [applyLayout]);

  // Handle compact layout toggle and viewport changes
  useEffect(() => {
    if (isCompactLayout) {
      hasUserResizedRef.current = false;
      setLeftPaneWidth(null);
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }
    const host = hostRef.current;
    if (!host) return;
    applyLayout(host);
  }, [isCompactLayout, viewportWidth, applyLayout]);

  const startPanelResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const host = hostRef.current;
    if (isCompactLayout || !host) return;
    const hostRect = host.getBoundingClientRect();
    const terminalPanel = host.querySelector(".terminal-device") as HTMLElement | null;
    const initialWidth =
      leftPaneWidth ?? terminalPanel?.getBoundingClientRect().width ?? hostRect.width * DEFAULT_LEFT_PANE_RATIO;
    hasUserResizedRef.current = true;
    const startX = event.clientX;
    setIsResizingPanels(true);

    let currentWidth = initialWidth;
    const handlePointerMove = (moveEvent: PointerEvent) => {
      currentWidth = clampLeftPaneWidth(initialWidth + (moveEvent.clientX - startX), hostRect.width);
      setLeftPaneWidth(currentWidth);
    };
    const stopResize = () => {
      setIsResizingPanels(false);
      saveRatio(storageKeyRef.current, currentWidth, hostRect.width);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  }, [isCompactLayout, leftPaneWidth]);

  const dualStageStyle: React.CSSProperties | undefined =
    !isCompactLayout && leftPaneWidth
      ? { gridTemplateColumns: `${leftPaneWidth}px 8px minmax(0, 1fr)` }
      : undefined;

  return { leftPaneWidth, isResizingPanels, dualStageRef, dualStageStyle, startPanelResize };
};
