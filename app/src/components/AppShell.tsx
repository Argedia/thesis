import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import { useUiPreferencesSync } from "../hooks/useUiPreferencesSync";
import { APP_ROUTES } from "../types/routes";
import { useTutorial } from "../features/tutorial/TutorialProvider";
import {
  hasSeenTutorial,
  markTutorialSeen
} from "../features/tutorial/storage";
import type { TutorialId } from "../features/tutorial/tutorials";
import { tutorialAnchorProps } from "../features/tutorial/anchors";

export function AppShell() {
  useUiPreferencesSync();
  const location = useLocation();
  const { startTutorial } = useTutorial();

  const currentTutorialId = useMemo<TutorialId | null>(() => {
    const pathname = location.pathname;
    if (pathname === APP_ROUTES.home) {
      return "app-home-basics";
    }
    if (pathname === APP_ROUTES.play) {
      return "community-basics";
    }
    if (pathname === APP_ROUTES.campaign) {
      return "campaign-world-basics";
    }
    if (pathname === APP_ROUTES.editor) {
      return "editor-drafts-basics";
    }
    if (pathname === APP_ROUTES.settings) {
      return "settings-basics";
    }
    if (pathname.startsWith(`${APP_ROUTES.play}/`)) {
      return "campaign-level-basics";
    }
    if (pathname.startsWith(`${APP_ROUTES.editor}/`)) {
      return "editor-basics";
    }
    return null;
  }, [location.pathname]);

  useEffect(() => {
    if (
      !currentTutorialId ||
      currentTutorialId === "campaign-world-basics" ||
      currentTutorialId === "campaign-level-basics" ||
      hasSeenTutorial(currentTutorialId)
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void startTutorial(currentTutorialId).then((didStart) => {
        if (didStart) {
          markTutorialSeen(currentTutorialId);
        }
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [currentTutorialId, startTutorial]);

  return (
    <div className="app-shell">
      <Outlet />
      {currentTutorialId ? (
        <TooltipTrigger delay={180} closeDelay={80}>
          <Button
            className="app-help-fab"
            aria-label="Open help guide"
            onPress={() => void startTutorial(currentTutorialId)}
            {...tutorialAnchorProps("app-help-fab")}
          >
            ?
          </Button>
          <Tooltip className="app-tooltip">A little lost? Click this!</Tooltip>
        </TooltipTrigger>
      ) : null}
    </div>
  );
}
