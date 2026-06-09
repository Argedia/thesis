export const TUTORIAL_ANCHOR_ATTRIBUTE = "data-tutorial-anchor";

export type TutorialTarget = string | (() => Element | null);

export const tutorialAnchorProps = (anchorId: string) =>
  ({ [TUTORIAL_ANCHOR_ATTRIBUTE]: anchorId } as const);

export const tutorialSelector = (anchorId: string): string =>
  `[${TUTORIAL_ANCHOR_ATTRIBUTE}="${anchorId}"]`;

export const setTutorialAnchor = <T extends HTMLElement>(element: T, anchorId: string): T => {
  element.setAttribute(TUTORIAL_ANCHOR_ATTRIBUTE, anchorId);
  return element;
};

export const resolveTutorialTarget = (target: TutorialTarget): Element | null => {
  if (typeof target === "string") {
    return document.querySelector(target);
  }

  return target();
};

const isRenderableTutorialTarget = (element: Element | null): element is Element => {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return (
    (element as HTMLElement).offsetWidth > 0 ||
    (element as HTMLElement).offsetHeight > 0 ||
    element.getClientRects().length > 0
  ) && rect.width > 0 && rect.height > 0;
};

export const waitForTutorialTarget = (
  target: TutorialTarget,
  timeoutMs = 4000
): Promise<Element> =>
  new Promise((resolve, reject) => {
    const immediate = resolveTutorialTarget(target);
    if (isRenderableTutorialTarget(immediate)) {
      resolve(immediate);
      return;
    }

    const observer = new MutationObserver(() => {
      const next = resolveTutorialTarget(target);
      if (!isRenderableTutorialTarget(next)) {
        return;
      }

      window.clearTimeout(timeoutId);
      observer.disconnect();
      resolve(next);
    });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error("Tutorial target not found before timeout."));
    }, timeoutMs);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    const frameTick = () => {
      const next = resolveTutorialTarget(target);
      if (isRenderableTutorialTarget(next)) {
        window.clearTimeout(timeoutId);
        observer.disconnect();
        resolve(next);
        return;
      }

      if (Date.now() < deadline) {
        window.requestAnimationFrame(frameTick);
      }
    };

    const deadline = Date.now() + timeoutMs;
    window.requestAnimationFrame(frameTick);
  });
