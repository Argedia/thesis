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

export const waitForTutorialTarget = (
  target: TutorialTarget,
  timeoutMs = 4000
): Promise<Element> =>
  new Promise((resolve, reject) => {
    const immediate = resolveTutorialTarget(target);
    if (immediate) {
      resolve(immediate);
      return;
    }

    const observer = new MutationObserver(() => {
      const next = resolveTutorialTarget(target);
      if (!next) {
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
  });
