import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction
} from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { driver, type AllowedButtons, type DriveStep, type Driver } from "driver.js";
import { resolveTutorialTarget, waitForTutorialTarget } from "./anchors";
import { getTutorial, type TutorialId } from "./tutorials";
import type {
  TutorialDefinition,
  TutorialInlineStepMode,
  TutorialPresentation,
  TutorialStepDefinition
} from "./types";
import type { PopoverDOM } from "driver.js";
import { t as translate } from "../../i18n-helpers";

interface TutorialContextValue {
  activeTutorialId: TutorialId | null;
  activeStepId: string | null;
  isActive: boolean;
  startTutorial: (tutorialId: TutorialId) => Promise<boolean>;
  notifyTutorialEvent: (eventId: string) => void;
  stopTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const DEFAULT_WAIT_TIMEOUT_MS = 5000;
interface ActiveTutorialState {
  tutorial: TutorialDefinition;
  index: number;
  presentation: TutorialPresentation;
}

interface InlineTutorialRenderState {
  tutorialId: TutorialId;
  stepId: string;
  mode: TutorialInlineStepMode;
  hideCard: boolean;
  title: string;
  description: string;
  targetRect: DOMRect;
  interactionRect: DOMRect;
  arrowTargetRect: DOMRect | null;
  highlightPadding: number;
  blockOutsideInteraction: boolean;
  cardStyle: CSSProperties;
  canGoBack: boolean;
  canGoNext: boolean;
  captureAnywhereClick: boolean;
  nextLabel?: string;
  previousLabel?: string;
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const driverRef = useRef<Driver | null>(null);
  const activeRef = useRef<ActiveTutorialState | null>(null);
  const targetCleanupRef = useRef<(() => void) | null>(null);
  const viewportCleanupRef = useRef<(() => void) | null>(null);
  const pendingAdvanceRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef(0);
  const [activeTutorialId, setActiveTutorialId] = useState<TutorialId | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [inlineState, setInlineState] = useState<InlineTutorialRenderState | null>(null);

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
    setInlineState(null);
    setActiveTutorialId(null);
    setActiveStepId(null);
  }, []);

  const startTutorial = useCallback(async (tutorialId: TutorialId) => {
    const tutorial = getTutorial(tutorialId);
    if (!tutorial) {
      return false;
    }

    const presentation = tutorial.presentation ?? "overlay";
    if (presentation === "inline") {
      return startInlineTutorial({
        tutorial,
        setActiveTutorialId,
        setActiveStepId,
        setInlineState,
        activeRef,
        driverRef,
        requestIdRef,
        targetCleanupRef,
        viewportCleanupRef,
        pendingAdvanceRef
      });
    }

    return startOverlayTutorial({
      tutorial,
      setActiveTutorialId,
      setActiveStepId,
      activeRef,
      driverRef,
      requestIdRef,
      targetCleanupRef,
      viewportCleanupRef,
      pendingAdvanceRef
    });
  }, []);

  const goToInlineStep = useCallback(async (direction: "next" | "previous") => {
    const active = activeRef.current;
    if (!active || active.presentation !== "inline") {
      return;
    }

    const targetIndex = direction === "next" ? active.index + 1 : active.index - 1;
    const nextStep = active.tutorial.steps[targetIndex];
    if (!nextStep) {
      if (direction === "next") {
        stopTutorial();
      }
      return;
    }

    const requestId = requestIdRef.current;
    await showInlineStep({
      tutorial: active.tutorial,
      index: targetIndex,
      requestId,
      getActiveRequestId: () => requestIdRef.current,
      setActiveTutorialId,
      setActiveStepId,
      setInlineState,
      activeRef,
      targetCleanupRef,
      pendingAdvanceRef,
      onFinish: stopTutorial,
      onNavigate: goToInlineStep
    });
  }, [stopTutorial]);

  const refreshInlineStep = useCallback(() => {
    const active = activeRef.current;
    if (!active || active.presentation !== "inline") {
      return;
    }

    const step = active.tutorial.steps[active.index];
    const target = resolveTutorialTarget(step.target);
    if (!target) {
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const arrowTarget = step.arrowTarget ? resolveTutorialTarget(step.arrowTarget) : null;
    const arrowTargetRect = arrowTarget?.getBoundingClientRect() ?? null;
    setInlineState((current) => {
      if (!current || current.tutorialId !== active.tutorial.id || current.stepId !== step.id) {
        return current;
      }

      return {
        ...current,
        targetRect,
        interactionRect: computeInlineInteractionRect(
          targetRect,
          arrowTargetRect,
          step.inlineMode ?? "interactive"
        ),
        arrowTargetRect,
        blockOutsideInteraction: step.blockOutsideInteraction === true,
        cardStyle: computeInlineTutorialCardStyle(targetRect, step),
        mode: step.inlineMode ?? "interactive",
        hideCard: step.hideCard === true,
        captureAnywhereClick: step.advanceOn === "anywhereClick"
      };
    });
  }, []);

  useEffect(() => {
    if (activeRef.current?.presentation !== "inline") {
      return;
    }

    const cleanup = bindInlineViewportRefresh(refreshInlineStep);
    viewportCleanupRef.current?.();
    viewportCleanupRef.current = cleanup;
    return cleanup;
  }, [activeTutorialId, refreshInlineStep]);

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
    activeStepId,
    isActive: activeTutorialId !== null,
    startTutorial,
    notifyTutorialEvent,
    stopTutorial
  }), [activeStepId, activeTutorialId, notifyTutorialEvent, startTutorial, stopTutorial]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <InlineTutorialCoach
        state={inlineState}
        onNext={() => void goToInlineStep("next")}
        onPrevious={() => void goToInlineStep("previous")}
      />
    </TutorialContext.Provider>
  );
}

export const useTutorial = (): TutorialContextValue => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider.");
  }

  return context;
};

const startOverlayTutorial = async (options: {
  tutorial: TutorialDefinition;
  setActiveTutorialId: (tutorialId: TutorialId | null) => void;
  setActiveStepId: (stepId: string | null) => void;
  activeRef: MutableRefObject<ActiveTutorialState | null>;
  driverRef: MutableRefObject<Driver | null>;
  requestIdRef: MutableRefObject<number>;
  targetCleanupRef: MutableRefObject<(() => void) | null>;
  viewportCleanupRef: MutableRefObject<(() => void) | null>;
  pendingAdvanceRef: MutableRefObject<(() => void) | null>;
}): Promise<boolean> => {
  const {
    tutorial,
    setActiveTutorialId,
    setActiveStepId,
    activeRef,
    driverRef,
    requestIdRef,
    targetCleanupRef,
    viewportCleanupRef,
    pendingAdvanceRef
  } = options;
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
            activeRef.current = { tutorial, index, presentation: "overlay" };
            setActiveTutorialId(tutorial.id as TutorialId);
            setActiveStepId(step.id);
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
        setActiveStepId(null);
      }
    });

  driverRef.current = instance;
  activeRef.current = { tutorial, index: 0, presentation: "overlay" };
  setActiveTutorialId(tutorial.id as TutorialId);
  setActiveStepId(firstStep.id);
  viewportCleanupRef.current = bindViewportRefresh(instance);
  instance.drive(0);
  return true;
};

const startInlineTutorial = async (options: {
  tutorial: TutorialDefinition;
  setActiveTutorialId: (tutorialId: TutorialId | null) => void;
  setActiveStepId: (stepId: string | null) => void;
  setInlineState: Dispatch<SetStateAction<InlineTutorialRenderState | null>>;
  activeRef: MutableRefObject<ActiveTutorialState | null>;
  driverRef: MutableRefObject<Driver | null>;
  requestIdRef: MutableRefObject<number>;
  targetCleanupRef: MutableRefObject<(() => void) | null>;
  viewportCleanupRef: MutableRefObject<(() => void) | null>;
  pendingAdvanceRef: MutableRefObject<(() => void) | null>;
}): Promise<boolean> => {
  const {
    tutorial,
    setActiveTutorialId,
    setActiveStepId,
    setInlineState,
    activeRef,
    driverRef,
    requestIdRef,
    targetCleanupRef,
    viewportCleanupRef,
    pendingAdvanceRef
  } = options;

  const requestId = ++requestIdRef.current;
  targetCleanupRef.current?.();
  targetCleanupRef.current = null;
  viewportCleanupRef.current?.();
  viewportCleanupRef.current = null;
  pendingAdvanceRef.current = null;
  driverRef.current?.destroy();
  driverRef.current = null;

  const navigateInlineStep = async (direction: "next" | "previous") => {
    const active = activeRef.current;
    if (!active || active.presentation !== "inline") {
      return;
    }

    const targetIndex = direction === "next" ? active.index + 1 : active.index - 1;
    const nextStep = active.tutorial.steps[targetIndex];
    if (!nextStep) {
      if (direction === "next") {
        pendingAdvanceRef.current = null;
        targetCleanupRef.current?.();
        targetCleanupRef.current = null;
        viewportCleanupRef.current?.();
        viewportCleanupRef.current = null;
        activeRef.current = null;
        setInlineState(null);
        setActiveTutorialId(null);
        setActiveStepId(null);
      }
      return;
    }

    await showInlineStep({
      tutorial: active.tutorial,
      index: targetIndex,
      requestId,
      getActiveRequestId: () => requestIdRef.current,
      setActiveTutorialId,
      setActiveStepId,
      setInlineState,
      activeRef,
      targetCleanupRef,
      pendingAdvanceRef,
      onFinish: () => {
        pendingAdvanceRef.current = null;
        targetCleanupRef.current?.();
        targetCleanupRef.current = null;
        viewportCleanupRef.current?.();
        viewportCleanupRef.current = null;
        activeRef.current = null;
        setInlineState(null);
        setActiveTutorialId(null);
        setActiveStepId(null);
      },
      onNavigate: navigateInlineStep
    });
  };

  return showInlineStep({
    tutorial,
    index: 0,
    requestId,
    getActiveRequestId: () => requestIdRef.current,
    setActiveTutorialId,
    setActiveStepId,
    setInlineState,
    activeRef,
    targetCleanupRef,
    pendingAdvanceRef,
    onFinish: () => {
      pendingAdvanceRef.current = null;
      targetCleanupRef.current?.();
      targetCleanupRef.current = null;
      viewportCleanupRef.current?.();
      viewportCleanupRef.current = null;
      activeRef.current = null;
      setInlineState(null);
      setActiveTutorialId(null);
      setActiveStepId(null);
    },
    onNavigate: navigateInlineStep
  });
};

const showInlineStep = async (options: {
  tutorial: TutorialDefinition;
  index: number;
  requestId: number;
  getActiveRequestId: () => number;
  setActiveTutorialId: (tutorialId: TutorialId | null) => void;
  setActiveStepId: (stepId: string | null) => void;
  setInlineState: Dispatch<SetStateAction<InlineTutorialRenderState | null>>;
  activeRef: MutableRefObject<ActiveTutorialState | null>;
  targetCleanupRef: MutableRefObject<(() => void) | null>;
  pendingAdvanceRef: MutableRefObject<(() => void) | null>;
  onFinish: () => void;
  onNavigate: (direction: "next" | "previous") => Promise<void> | void;
}): Promise<boolean> => {
  const {
    tutorial,
    index,
    requestId,
    getActiveRequestId,
    setActiveTutorialId,
    setActiveStepId,
    setInlineState,
    activeRef,
    targetCleanupRef,
    pendingAdvanceRef,
    onFinish,
    onNavigate
  } = options;
  const step = tutorial.steps[index];
  const target = await waitForTutorialTarget(
    step.target,
    step.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
  ).catch(() => null);

  if (!target || requestId !== getActiveRequestId()) {
    return false;
  }

  targetCleanupRef.current?.();
  targetCleanupRef.current = null;
  pendingAdvanceRef.current = null;

  const targetRect = target.getBoundingClientRect();
  const arrowTarget = step.arrowTarget ? resolveTutorialTarget(step.arrowTarget) : null;
  const arrowTargetRect = arrowTarget?.getBoundingClientRect() ?? null;
  activeRef.current = { tutorial, index, presentation: "inline" };
  setActiveTutorialId(tutorial.id as TutorialId);
  setActiveStepId(step.id);
  setInlineState({
    tutorialId: tutorial.id as TutorialId,
    stepId: step.id,
    title: step.title,
    description: step.description,
    mode: step.inlineMode ?? "interactive",
    hideCard: step.hideCard === true,
    targetRect,
    interactionRect: computeInlineInteractionRect(
      targetRect,
      arrowTargetRect,
      step.inlineMode ?? "interactive"
    ),
    arrowTargetRect,
    highlightPadding: Math.max(10, tutorial.stagePadding ?? 12),
    blockOutsideInteraction: step.blockOutsideInteraction === true,
    cardStyle: computeInlineTutorialCardStyle(targetRect, step),
    canGoBack: false,
    canGoNext:
      step.advanceOn !== "event" &&
      step.advanceOn !== "targetClick" &&
      step.advanceOn !== "anywhereClick",
    captureAnywhereClick: step.advanceOn === "anywhereClick",
    nextLabel: step.nextButtonText ?? tutorial.nextButtonText,
    previousLabel: step.previousButtonText ?? tutorial.previousButtonText
  });

  if (step.advanceOn === "event") {
    pendingAdvanceRef.current = () => {
      const hasNextStep = index + 1 < tutorial.steps.length;
      if (!hasNextStep) {
        onFinish();
        return;
      }

      void onNavigate("next");
    };
    return true;
  }

  if (step.advanceOn === "targetClick") {
    const handleClick = () => {
      const hasNextStep = index + 1 < tutorial.steps.length;
      if (!hasNextStep) {
        onFinish();
        return;
      }

      void onNavigate("next");
    };

    target.addEventListener("click", handleClick, { once: true });
    targetCleanupRef.current = () => target.removeEventListener("click", handleClick);
  }

  return true;
};

const APP_ROUTE_PREFIXES: Record<TutorialId, string> = {
  "app-home-basics": "/",
  "community-basics": "/play",
  "editor-drafts-basics": "/editor",
  "settings-basics": "/settings",
  "editor-basics": "/editor/",
  "campaign-level-basics": "/play/",
  "campaign-w1-l1-guided": "/play/",
  "campaign-w1-l2-guided": "/play/",
  "campaign-w1-l3-guided": "/play/",
  "campaign-w2-l4-guided": "/play/",
  "campaign-w3-l3-guided": "/play/",
  "campaign-w4-l3-guided": "/play/",
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

const computeInlineTutorialCardStyle = (
  targetRect: DOMRect,
  step: TutorialStepDefinition
): CSSProperties => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = Math.min(360, viewportWidth - 32);
  const gap = 18;
  const side = step.side ?? "bottom";
  const align = step.align ?? "start";

  const centeredLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
  const alignedLeft =
    align === "center"
      ? centeredLeft
      : align === "end"
        ? targetRect.right - cardWidth
        : targetRect.left;
  const horizontalLeft = clamp(alignedLeft, 16, Math.max(16, viewportWidth - cardWidth - 16));

  const cardHeightGuess = 220;
  const centeredTop = targetRect.top + targetRect.height / 2 - cardHeightGuess / 2;
  const verticalTop = clamp(centeredTop, 16, Math.max(16, viewportHeight - cardHeightGuess - 16));

  if (side === "left") {
    const left = targetRect.left - cardWidth - gap;
    return {
      top: verticalTop,
      left: left >= 16 ? left : clamp(targetRect.right + gap, 16, Math.max(16, viewportWidth - cardWidth - 16))
    };
  }

  if (side === "right") {
    const left = targetRect.right + gap;
    return {
      top: verticalTop,
      left: left + cardWidth <= viewportWidth - 16 ? left : clamp(targetRect.left - cardWidth - gap, 16, Math.max(16, viewportWidth - cardWidth - 16))
    };
  }

  if (side === "top") {
    const top = targetRect.top - cardHeightGuess - gap;
    return {
      top: top >= 16 ? top : clamp(targetRect.bottom + gap, 16, Math.max(16, viewportHeight - cardHeightGuess - 16)),
      left: horizontalLeft
    };
  }

  return {
    top: targetRect.bottom + gap + cardHeightGuess <= viewportHeight - 16
      ? targetRect.bottom + gap
      : clamp(targetRect.top - cardHeightGuess - gap, 16, Math.max(16, viewportHeight - cardHeightGuess - 16)),
    left: horizontalLeft
  };
};

const InlineTutorialCoach = ({
  state,
  onNext,
  onPrevious
}: {
  state: InlineTutorialRenderState | null;
  onNext: () => void;
  onPrevious: () => void;
}) => {
  if (!state) {
    return null;
  }

  const highlightStyle: CSSProperties = {
    top: state.targetRect.top - state.highlightPadding,
    left: state.targetRect.left - state.highlightPadding,
    width: state.targetRect.width + state.highlightPadding * 2,
    height: state.targetRect.height + state.highlightPadding * 2
  };
  const blockerStyles = state.blockOutsideInteraction
    ? computeInlineBlockerStyles(state.interactionRect, state.highlightPadding)
    : null;
  const arrowStyle = state.arrowTargetRect
    ? computeInlineArrowStyle(state.targetRect, state.arrowTargetRect, state.highlightPadding)
    : null;

  return (
    <div className="inline-tutorial-layer" aria-live="polite">
      {state.captureAnywhereClick ? (
        <button
          type="button"
          className="inline-tutorial-overlay-capture"
          onClick={onNext}
          aria-label={state.nextLabel ?? "Continue"}
        />
      ) : null}
      {blockerStyles ? (
        <>
          <div className="inline-tutorial-blocker" style={blockerStyles.top} onClick={state.captureAnywhereClick ? onNext : undefined} />
          <div className="inline-tutorial-blocker" style={blockerStyles.left} onClick={state.captureAnywhereClick ? onNext : undefined} />
          <div className="inline-tutorial-blocker" style={blockerStyles.right} onClick={state.captureAnywhereClick ? onNext : undefined} />
          <div className="inline-tutorial-blocker" style={blockerStyles.bottom} onClick={state.captureAnywhereClick ? onNext : undefined} />
        </>
      ) : null}
      <div
        className={`inline-tutorial-highlight${state.mode === "showcase" ? " is-showcase" : ""}`}
        style={highlightStyle}
      />
      {arrowStyle ? (
        <svg className="inline-tutorial-arrow" style={arrowStyle.svgStyle} viewBox={`0 0 ${arrowStyle.width} ${arrowStyle.height}`}>
          <defs>
            <marker
              id="inline-tutorial-arrowhead"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
            >
              <path d="M 0 0 L 12 6 L 0 12 z" fill="#ffd166" />
            </marker>
          </defs>
          <line
            x1={arrowStyle.x1}
            y1={arrowStyle.y1}
            x2={arrowStyle.x2}
            y2={arrowStyle.y2}
            className="inline-tutorial-arrow-line"
            markerEnd="url(#inline-tutorial-arrowhead)"
          />
        </svg>
      ) : null}
      {state.hideCard ? null : (
        <section className="inline-tutorial-card" style={state.cardStyle}>
          <div className="inline-tutorial-header">
            {state.canGoBack ? (
              <button
                type="button"
                className="inline-tutorial-icon-button inline-tutorial-icon-button--header"
                onClick={onPrevious}
                aria-label={state.previousLabel ?? translate("tutorials.common.back")}
                title={state.previousLabel ?? translate("tutorials.common.back")}
              >
                <ArrowLeft size={16} aria-hidden="true" />
              </button>
            ) : null}
            <h2 className="inline-tutorial-title">{state.title}</h2>
          </div>
          <p className="inline-tutorial-description">{state.description}</p>
          <div className="inline-tutorial-actions">
            {state.canGoBack ? <span /> : null}
            {state.canGoNext ? (
              <button type="button" onClick={onNext}>
                {state.nextLabel ?? translate("tutorials.common.next")}
              </button>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
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

const bindInlineViewportRefresh = (refresh: () => void): (() => void) => {
  const handleRefresh = () => {
    window.requestAnimationFrame(refresh);
  };

  window.addEventListener("resize", handleRefresh);
  window.addEventListener("scroll", handleRefresh, true);

  return () => {
    window.removeEventListener("resize", handleRefresh);
    window.removeEventListener("scroll", handleRefresh, true);
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const computeInlineBlockerStyles = (
  targetRect: DOMRect,
  padding: number
): {
  top: CSSProperties;
  left: CSSProperties;
  right: CSSProperties;
  bottom: CSSProperties;
} => {
  const holeTop = Math.max(0, targetRect.top - padding);
  const holeLeft = Math.max(0, targetRect.left - padding);
  const holeRight = Math.min(window.innerWidth, targetRect.right + padding);
  const holeBottom = Math.min(window.innerHeight, targetRect.bottom + padding);

  return {
    top: {
      top: 0,
      left: 0,
      width: "100vw",
      height: holeTop
    },
    left: {
      top: holeTop,
      left: 0,
      width: holeLeft,
      height: Math.max(0, holeBottom - holeTop)
    },
    right: {
      top: holeTop,
      left: holeRight,
      width: Math.max(0, window.innerWidth - holeRight),
      height: Math.max(0, holeBottom - holeTop)
    },
    bottom: {
      top: holeBottom,
      left: 0,
      width: "100vw",
      height: Math.max(0, window.innerHeight - holeBottom)
    }
  };
};

const computeInlineInteractionRect = (
  targetRect: DOMRect,
  arrowTargetRect: DOMRect | null,
  mode: TutorialInlineStepMode
): DOMRect => {
  if (mode !== "interactive" || !arrowTargetRect) {
    return targetRect;
  }

  const left = Math.min(targetRect.left, arrowTargetRect.left);
  const top = Math.min(targetRect.top, arrowTargetRect.top);
  const right = Math.max(targetRect.right, arrowTargetRect.right);
  const bottom = Math.max(targetRect.bottom, arrowTargetRect.bottom);
  return new DOMRect(left, top, right - left, bottom - top);
};

const computeInlineArrowStyle = (
  sourceRect: DOMRect,
  targetRect: DOMRect,
  padding: number
): {
  svgStyle: CSSProperties;
  width: number;
  height: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} => {
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const sourceX = targetCenterX >= sourceCenterX
    ? sourceRect.right + padding
    : sourceRect.left - padding;
  const sourceY = sourceRect.top + sourceRect.height / 2;
  const targetX = targetCenterX >= sourceCenterX
    ? targetRect.left + Math.min(targetRect.width * 0.45, 220)
    : targetRect.right - Math.min(targetRect.width * 0.45, 220);
  const targetY = targetRect.top + Math.min(targetRect.height * 0.45, 180);
  const left = Math.min(sourceX, targetX);
  const top = Math.min(sourceY, targetY);
  const width = Math.max(24, Math.abs(targetX - sourceX));
  const height = Math.max(24, Math.abs(targetY - sourceY));

  return {
    svgStyle: {
      left,
      top,
      width,
      height
    },
    width,
    height,
    x1: sourceX - left,
    y1: sourceY - top,
    x2: targetX - left,
    y2: targetY - top
  };
};
