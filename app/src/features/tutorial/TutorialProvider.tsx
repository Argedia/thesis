import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { driver, type AllowedButtons, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { waitForTutorialTarget } from "./anchors";
import { tutorials, type TutorialId } from "./tutorials";
import type { TutorialDefinition, TutorialStepDefinition } from "./types";

interface TutorialContextValue {
  activeTutorialId: TutorialId | null;
  isActive: boolean;
  startTutorial: (tutorialId: TutorialId) => Promise<void>;
  stopTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const DEFAULT_WAIT_TIMEOUT_MS = 5000;

export function TutorialProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const driverRef = useRef<Driver | null>(null);
  const activeRef = useRef<{ tutorial: TutorialDefinition; index: number } | null>(null);
  const targetCleanupRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef(0);
  const [activeTutorialId, setActiveTutorialId] = useState<TutorialId | null>(null);

  const stopTutorial = useCallback(() => {
    requestIdRef.current += 1;
    targetCleanupRef.current?.();
    targetCleanupRef.current = null;
    activeRef.current = null;
    driverRef.current?.destroy();
    setActiveTutorialId(null);
  }, []);

  const ensureDriver = useCallback(() => {
    if (!driverRef.current) {
      driverRef.current = driver({
        animate: true,
        allowClose: true,
        allowKeyboardControl: true,
        smoothScroll: true,
        overlayColor: "#10233d",
        popoverClass: "app-tutorial-popover"
      });
    }

    return driverRef.current;
  }, []);

  const showStep = useCallback(async (tutorial: TutorialDefinition, index: number) => {
    if (index < 0 || index >= tutorial.steps.length) {
      stopTutorial();
      return;
    }

    const requestId = ++requestIdRef.current;
    targetCleanupRef.current?.();
    targetCleanupRef.current = null;

    const step = tutorial.steps[index];
    const target = await waitForTutorialTarget(
      step.target,
      step.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
    ).catch(() => null);

    if (!target || requestId !== requestIdRef.current) {
      return;
    }

    const instance = ensureDriver();
    const isFirst = index === 0;
    const isLast = index === tutorial.steps.length - 1;

    activeRef.current = { tutorial, index };
    setActiveTutorialId(tutorial.id as TutorialId);

    instance.setConfig({
      animate: true,
      allowClose: true,
      allowKeyboardControl: true,
      smoothScroll: true,
      overlayColor: "#10233d",
      overlayOpacity: tutorial.overlayOpacity ?? 0.7,
      stagePadding: step.padding ?? tutorial.stagePadding ?? 10,
      stageRadius: tutorial.stageRadius ?? 16,
      popoverClass: "app-tutorial-popover",
      onDestroyed: () => {
        targetCleanupRef.current?.();
        targetCleanupRef.current = null;
      }
    });

    const advance = () => {
      if (isLast) {
        stopTutorial();
        return;
      }

      void showStep(tutorial, index + 1);
    };

    const previous = () => {
      if (isFirst) {
        return;
      }

      void showStep(tutorial, index - 1);
    };

    const driveStep = buildDriverStep({
      step,
      target,
      isFirst,
      isLast,
      tutorial,
      onNext: advance,
      onPrevious: previous,
      onClose: stopTutorial,
      onRegisterTargetCleanup: (cleanup) => {
        targetCleanupRef.current?.();
        targetCleanupRef.current = cleanup;
      }
    });

    instance.highlight(driveStep);
  }, [ensureDriver, stopTutorial]);

  const startTutorial = useCallback(async (tutorialId: TutorialId) => {
    const tutorial = tutorials[tutorialId];
    if (!tutorial) {
      return;
    }

    await showStep(tutorial, 0);
  }, [showStep]);

  useEffect(() => {
    const active = activeRef.current;
    if (!active?.tutorial.route) {
      return;
    }

    const routePrefix = APP_ROUTE_PREFIXES[active.tutorial.id as TutorialId];
    if (!routePrefix || location.pathname.startsWith(routePrefix)) {
      return;
    }

    stopTutorial();
  }, [location.pathname, stopTutorial]);

  useEffect(() => stopTutorial, [stopTutorial]);

  const value = useMemo<TutorialContextValue>(() => ({
    activeTutorialId,
    isActive: activeTutorialId !== null,
    startTutorial,
    stopTutorial
  }), [activeTutorialId, startTutorial, stopTutorial]);

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export const useTutorial = (): TutorialContextValue => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider.");
  }

  return context;
};

const APP_ROUTE_PREFIXES: Record<TutorialId, string> = {
  "editor-basics": "/editor/"
};

const buildDriverStep = (options: {
  step: TutorialStepDefinition;
  target: Element;
  tutorial: TutorialDefinition;
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onRegisterTargetCleanup: (cleanup: (() => void) | null) => void;
}): DriveStep => {
  const {
    step,
    target,
    tutorial,
    isFirst,
    isLast,
    onNext,
    onPrevious,
    onClose,
    onRegisterTargetCleanup
  } = options;

  const buttons: AllowedButtons[] =
    step.advanceOn === "targetClick"
      ? isFirst
        ? ["close"]
        : ["previous", "close"]
      : isFirst
        ? ["next", "close"]
        : ["previous", "next", "close"];

  return {
    element: target,
    disableActiveInteraction: step.allowInteraction === false,
    onHighlighted: (element) => {
      if (!element || step.advanceOn !== "targetClick") {
        onRegisterTargetCleanup(null);
        return;
      }

      const handleClick = () => onNext();
      element.addEventListener("click", handleClick, { once: true });
      onRegisterTargetCleanup(() => {
        element.removeEventListener("click", handleClick);
      });
    },
    onDeselected: () => {
      onRegisterTargetCleanup(null);
    },
    popover: {
      title: step.title,
      description: step.description,
      side: step.side ?? "bottom",
      align: step.align ?? "start",
      showButtons: buttons,
      nextBtnText: step.nextButtonText ?? (isLast ? "Finish" : tutorial.nextButtonText ?? "Next"),
      prevBtnText: step.previousButtonText ?? tutorial.previousButtonText ?? "Back",
      onNextClick: () => onNext(),
      onPrevClick: () => onPrevious(),
      onCloseClick: () => onClose()
    }
  };
};
