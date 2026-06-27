import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { driver, type AllowedButtons, type DriveStep, type Driver } from "driver.js";
import { resolveTutorialTarget, waitForTutorialTarget } from "./anchors";
import { getTutorial, type TutorialId } from "./tutorials";
import type { TutorialDefinition, TutorialStepDefinition } from "./types";
import type { PopoverDOM } from "driver.js";

interface TutorialContextValue {
  activeTutorialId: TutorialId | null;
  isActive: boolean;
  startTutorial: (tutorialId: TutorialId) => Promise<boolean>;
  notifyTutorialEvent: (eventId: string) => void;
  stopTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const DEFAULT_WAIT_TIMEOUT_MS = 5000;

export function TutorialProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const driverRef = useRef<Driver | null>(null);
  const activeRef = useRef<{ tutorial: TutorialDefinition; index: number } | null>(null);
  const targetCleanupRef = useRef<(() => void) | null>(null);
  const viewportCleanupRef = useRef<(() => void) | null>(null);
  const pendingAdvanceRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef(0);
  const [activeTutorialId, setActiveTutorialId] = useState<TutorialId | null>(null);

  const stopTutorial = useCallback(() => {
    requestIdRef.current += 1;
    pendingAdvanceRef.current = null;
    targetCleanupRef.current?.();
    targetCleanupRef.current = null;
    viewportCleanupRef.current?.();
    viewportCleanupRef.current = null;
    activeRef.current = null;
    driverRef.current?.destroy();
    driverRef.current = null;
    setActiveTutorialId(null);
  }, []);

  const startTutorial = useCallback(async (tutorialId: TutorialId) => {
    const tutorial = getTutorial(tutorialId);
    if (!tutorial) {
      return false;
    }

    const requestId = ++requestIdRef.current;
    targetCleanupRef.current?.();
    targetCleanupRef.current = null;
    viewportCleanupRef.current?.();
    viewportCleanupRef.current = null;

    const firstStep = tutorial.steps[0];
    const firstTarget = await waitForTutorialTarget(
      firstStep.target,
      firstStep.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
    ).catch(() => null);

    if (!firstTarget || requestId !== requestIdRef.current) {
      return false;
    }

    driverRef.current?.destroy();
    driverRef.current = null;

    const instance = driver({
      animate: true,
      allowClose: tutorial.dismissible !== false,
      allowKeyboardControl: tutorial.dismissible !== false,
      smoothScroll: true,
      overlayColor: "#10233d",
      overlayOpacity: tutorial.overlayOpacity ?? 0.7,
      stagePadding: tutorial.stagePadding ?? 10,
      stageRadius: tutorial.stageRadius ?? 16,
      popoverClass: "app-tutorial-popover",
      onPopoverRender: (popover) => {
        applyTutorialPopoverStyles(popover, activeRef.current);
      },
      nextBtnText: tutorial.nextButtonText,
      prevBtnText: tutorial.previousButtonText,
      doneBtnText: tutorial.closeButtonText,
      steps: tutorial.steps.map((step, index) =>
        buildDriverStep({
          step,
          index,
          tutorial,
          requestId,
          getActiveRequestId: () => requestIdRef.current,
          getDriver: () => driverRef.current,
          onStepActivated: () => {
            activeRef.current = { tutorial, index };
            setActiveTutorialId(tutorial.id as TutorialId);
          },
          onRegisterPendingAdvance: (advance) => {
            pendingAdvanceRef.current = advance;
          },
          onRegisterTargetCleanup: (cleanup) => {
            targetCleanupRef.current?.();
            targetCleanupRef.current = cleanup;
          }
        })
      ),
      onDestroyed: () => {
        pendingAdvanceRef.current = null;
        targetCleanupRef.current?.();
        targetCleanupRef.current = null;
        viewportCleanupRef.current?.();
        viewportCleanupRef.current = null;
        activeRef.current = null;
        driverRef.current = null;
        setActiveTutorialId(null);
      }
    });

    driverRef.current = instance;
    activeRef.current = { tutorial, index: 0 };
    setActiveTutorialId(tutorial.id as TutorialId);
    viewportCleanupRef.current = bindViewportRefresh(instance);
    instance.drive(0);
    return true;
  }, []);

  useEffect(() => {
    const active = activeRef.current;
    if (!active?.tutorial.route) {
      return;
    }

    const routePrefix = APP_ROUTE_PREFIXES[active.tutorial.id as TutorialId];
    const routeStillMatches =
      routePrefix === APP_ROUTE_PREFIXES["app-home-basics"] ||
      routePrefix === APP_ROUTE_PREFIXES["community-basics"] ||
      routePrefix === APP_ROUTE_PREFIXES["editor-drafts-basics"] ||
      routePrefix === APP_ROUTE_PREFIXES["settings-basics"]
        ? location.pathname === routePrefix
        : !routePrefix || location.pathname.startsWith(routePrefix);

    if (routeStillMatches) {
      return;
    }

    stopTutorial();
  }, [location.pathname, stopTutorial]);

  useEffect(() => stopTutorial, [stopTutorial]);

  const notifyTutorialEvent = useCallback((eventId: string) => {
    const active = activeRef.current;
    if (!active) {
      return;
    }

    const step = active.tutorial.steps[active.index];
    if (step.advanceOn !== "event" || step.advanceOnEvent !== eventId) {
      return;
    }

    pendingAdvanceRef.current?.();
  }, []);

  const value = useMemo<TutorialContextValue>(() => ({
    activeTutorialId,
    isActive: activeTutorialId !== null,
    startTutorial,
    notifyTutorialEvent,
    stopTutorial
  }), [activeTutorialId, notifyTutorialEvent, startTutorial, stopTutorial]);

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
  "app-home-basics": "/",
  "community-basics": "/play",
  "editor-drafts-basics": "/editor",
  "settings-basics": "/settings",
  "editor-basics": "/editor/",
  "campaign-level-basics": "/play/",
  "campaign-w1-l1-guided": "/play/",
  "campaign-world-basics": "/campaign"
};

const buildDriverStep = (options: {
  step: TutorialStepDefinition;
  index: number;
  tutorial: TutorialDefinition;
  requestId: number;
  getActiveRequestId: () => number;
  getDriver: () => Driver | null;
  onStepActivated: () => void;
  onRegisterPendingAdvance: (advance: (() => void) | null) => void;
  onRegisterTargetCleanup: (cleanup: (() => void) | null) => void;
}): DriveStep => {
  const {
    step,
    index,
    tutorial,
    requestId,
    getActiveRequestId,
    getDriver,
    onStepActivated,
    onRegisterPendingAdvance,
    onRegisterTargetCleanup
  } = options;
  const isFirst = index === 0;
  const targetResolver = step.target;

  const buttons: AllowedButtons[] =
    step.advanceOn === "targetClick" || step.advanceOn === "event"
      ? tutorial.dismissible === false
        ? isFirst
          ? []
          : ["previous"]
        : isFirst
          ? ["close"]
          : ["previous", "close"]
      : tutorial.dismissible === false
        ? isFirst
          ? ["next"]
          : ["previous", "next"]
        : isFirst
          ? ["next", "close"]
          : ["previous", "next", "close"];

  return {
    element:
      typeof targetResolver === "string"
        ? targetResolver
        : () => resolveTutorialTarget(targetResolver) as Element,
    disableActiveInteraction: step.allowInteraction === false,
    onHighlightStarted: () => {
      onStepActivated();
      window.requestAnimationFrame(() => {
        if (requestId === getActiveRequestId()) {
          getDriver()?.refresh();
        }
      });
      window.setTimeout(() => {
        if (requestId === getActiveRequestId()) {
          getDriver()?.refresh();
        }
      }, 40);
    },
    onHighlighted: (element, _currentStep, options) => {
      onRegisterPendingAdvance(null);

      if (step.advanceOn === "event") {
        onRegisterTargetCleanup(null);
        onRegisterPendingAdvance(() => {
          const nextStep = tutorial.steps[index + 1];
          if (!nextStep) {
            options.driver.destroy();
            return;
          }

          void waitForTutorialTarget(
            nextStep.target,
            nextStep.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
          ).then(() => {
            options.driver.moveNext();
          }).catch(() => undefined);
        });
        return;
      }

      if (!element || step.advanceOn !== "targetClick") {
        onRegisterTargetCleanup(null);
        return;
      }

      const handleClick = () => {
        const nextStep = tutorial.steps[index + 1];
        if (!nextStep) {
          options.driver.destroy();
          return;
        }

        void waitForTutorialTarget(
          nextStep.target,
          nextStep.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
        ).then(() => {
          options.driver.moveNext();
        }).catch(() => undefined);
      };

      element.addEventListener("click", handleClick, { once: true });
      onRegisterTargetCleanup(() => {
        element.removeEventListener("click", handleClick);
      });
    },
    onDeselected: () => {
      onRegisterPendingAdvance(null);
      onRegisterTargetCleanup(null);
    },
    popover: {
      title: step.title,
      description: step.description,
      side: step.side ?? "bottom",
      align: step.align ?? "start",
      showButtons: buttons,
      nextBtnText: step.nextButtonText,
      prevBtnText: step.previousButtonText,
      onNextClick:
        step.advanceOn === "targetClick" || step.advanceOn === "event"
          ? undefined
          : () => {
              void navigateToStep({
                direction: "next",
                tutorial,
                currentIndex: index,
                requestId,
                getActiveRequestId,
                getDriver
              });
            },
      onPrevClick:
        isFirst
          ? undefined
          : () => {
              void navigateToStep({
                direction: "previous",
                tutorial,
                currentIndex: index,
                requestId,
                getActiveRequestId,
                getDriver
              });
            }
    }
  };
};

const applyTutorialPopoverStyles = (
  popover: PopoverDOM,
  active: { tutorial: TutorialDefinition; index: number } | null
): void => {
  const { wrapper, title, description, closeButton, footer, footerButtons, previousButton, nextButton } = popover;
  const activeStep = active ? active.tutorial.steps[active.index] : null;
  const hideCloseButton = active?.tutorial.dismissible === false;
  const hidePreviousButton = !active || active.index === 0;
  const hideNextButton = activeStep?.advanceOn === "targetClick" || activeStep?.advanceOn === "event";

  wrapper.style.all = "unset";
  wrapper.style.position = "fixed";
  wrapper.style.top = "0";
  wrapper.style.right = "0";
  wrapper.style.display = "block";
  wrapper.style.boxSizing = "border-box";
  wrapper.style.maxWidth = "340px";
  wrapper.style.minWidth = "250px";
  wrapper.style.padding = "15px";
  wrapper.style.border = "1px solid rgba(157, 185, 212, 0.9)";
  wrapper.style.borderRadius = "16px";
  wrapper.style.background = "rgba(255, 255, 255, 0.98)";
  wrapper.style.boxShadow = "0 24px 48px rgba(16, 35, 61, 0.2)";
  wrapper.style.color = "#355070";
  wrapper.style.zIndex = "1000000000";
  wrapper.style.pointerEvents = "auto";

  title.style.fontSize = "1rem";
  title.style.fontWeight = "900";
  title.style.margin = "0";

  description.style.color = "#53718a";
  description.style.fontSize = "0.9rem";
  description.style.lineHeight = "1.45";
  description.style.fontWeight = "700";
  description.style.margin = "0.35rem 0 0";

  footer.style.marginTop = "0.8rem";
  footer.style.display = "flex";
  footer.style.alignItems = "center";
  footer.style.justifyContent = "space-between";
  footerButtons.style.gap = "0.5rem";
  footerButtons.style.display = "flex";
  footerButtons.style.flexGrow = "1";
  footerButtons.style.justifyContent = "flex-end";

  closeButton.style.all = "unset";
  closeButton.style.position = "absolute";
  closeButton.style.top = "8px";
  closeButton.style.right = "8px";
  closeButton.style.width = "28px";
  closeButton.style.height = "28px";
  closeButton.style.color = "#6b8198";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontSize = "18px";
  closeButton.style.lineHeight = "1";
  closeButton.style.textAlign = "center";
  closeButton.style.display = hideCloseButton ? "none" : "block";

  [previousButton, nextButton].forEach((button) => {
    button.style.all = "unset";
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.minHeight = "38px";
    button.style.padding = "0.55rem 0.9rem";
    button.style.border = "1px solid #c9d6e3";
    button.style.borderRadius = "12px";
    button.style.background = "#ffffff";
    button.style.color = "#355070";
    button.style.fontSize = "0.88rem";
    button.style.fontWeight = "800";
    button.style.cursor = "pointer";
    button.style.boxSizing = "border-box";
  });

  previousButton.style.display = hidePreviousButton ? "none" : "inline-flex";
  nextButton.style.display = hideNextButton ? "none" : "inline-flex";
  footerButtons.style.justifyContent =
    hidePreviousButton && hideNextButton ? "flex-end" : "space-between";
};

const navigateToStep = async (options: {
  direction: "next" | "previous";
  tutorial: TutorialDefinition;
  currentIndex: number;
  requestId: number;
  getActiveRequestId: () => number;
  getDriver: () => Driver | null;
}): Promise<void> => {
  const { direction, tutorial, currentIndex, requestId, getActiveRequestId, getDriver } = options;
  const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  const nextStep = tutorial.steps[targetIndex];
  const activeDriver = getDriver();

  if (!activeDriver || requestId !== getActiveRequestId()) {
    return;
  }

  if (!nextStep) {
    if (direction === "next") {
      activeDriver.destroy();
    }
    return;
  }

  const target = await waitForTutorialTarget(
    nextStep.target,
    nextStep.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
  ).catch(() => null);

  if (!target || requestId !== getActiveRequestId() || getDriver() !== activeDriver) {
    return;
  }

  if (direction === "next") {
    activeDriver.moveNext();
  } else {
    activeDriver.movePrevious();
  }
};

const bindViewportRefresh = (instance: Driver): (() => void) => {
  const refresh = () => {
    window.requestAnimationFrame(() => {
      const activeElement = instance.getActiveElement();
      if (activeElement) {
        instance.refresh();
      }
    });
  };

  window.addEventListener("resize", refresh);
  window.addEventListener("scroll", refresh, true);

  return () => {
    window.removeEventListener("resize", refresh);
    window.removeEventListener("scroll", refresh, true);
  };
};
