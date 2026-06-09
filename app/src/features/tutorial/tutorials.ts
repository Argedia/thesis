import { APP_ROUTES } from "../../types/routes";
import { t as translate } from "../../i18n-helpers";
import { tutorialSelector } from "./anchors";
import type { TutorialDefinition } from "./types";

export type TutorialId = "editor-basics" | "campaign-level-basics";

export const getTutorial = (tutorialId: TutorialId): TutorialDefinition | null => {
  const tutorials: Record<TutorialId, TutorialDefinition> = {
    "editor-basics": {
    id: "editor-basics",
    label: translate("tutorials.editorBasics.label"),
    route: `${APP_ROUTES.editor}/:draftId`,
    overlayOpacity: 0.7,
    stagePadding: 10,
    stageRadius: 16,
    nextButtonText: translate("tutorials.common.next"),
    previousButtonText: translate("tutorials.common.back"),
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "editor-actions",
        title: translate("tutorials.editorBasics.steps.actions.title"),
        description: translate("tutorials.editorBasics.steps.actions.description"),
        target: tutorialSelector("editor-actions"),
        side: "bottom",
        align: "end"
      },
      {
        id: "editor-palette-base",
        title: translate("tutorials.editorBasics.steps.paletteBase.title"),
        description: translate("tutorials.editorBasics.steps.paletteBase.description"),
        target: tutorialSelector("editor-palette-base"),
        side: "right",
        align: "start"
      },
      {
        id: "editor-program-body",
        title: translate("tutorials.editorBasics.steps.programBody.title"),
        description: translate("tutorials.editorBasics.steps.programBody.description"),
        target: tutorialSelector("editor-program-body"),
        side: "left",
        align: "start"
      },
      {
        id: "editor-board-config-button",
        title: translate("tutorials.editorBasics.steps.boardConfigButton.title"),
        description: translate("tutorials.editorBasics.steps.boardConfigButton.description"),
        target: tutorialSelector("editor-board-config-button"),
        side: "left",
        align: "center",
        advanceOn: "targetClick"
      },
      {
        id: "editor-board-config-panel",
        title: translate("tutorials.editorBasics.steps.boardConfigPanel.title"),
        description: translate("tutorials.editorBasics.steps.boardConfigPanel.description"),
        target: tutorialSelector("editor-board-config-panel"),
        side: "left",
        align: "start",
        allowInteraction: true,
        timeoutMs: 8000
      },
      {
        id: "editor-palette-side",
        title: translate("tutorials.editorBasics.steps.paletteSide.title"),
        description: translate("tutorials.editorBasics.steps.paletteSide.description"),
        target: tutorialSelector("editor-palette-side"),
        side: "left",
        align: "start"
      }
    ]
  },
  "campaign-level-basics": {
    id: "campaign-level-basics",
    label: translate("tutorials.campaignLevelBasics.label"),
    route: `${APP_ROUTES.play}/:levelId`,
    overlayOpacity: 0.74,
    stagePadding: 12,
    stageRadius: 16,
    nextButtonText: translate("tutorials.common.next"),
    previousButtonText: translate("tutorials.common.back"),
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "play-board-panel",
        title: translate("tutorials.campaignLevelBasics.steps.boardPanel.title"),
        description: translate("tutorials.campaignLevelBasics.steps.boardPanel.description"),
        target: tutorialSelector("play-board-header"),
        side: "left",
        align: "center"
      },
      {
        id: "play-preview-goal",
        title: translate("tutorials.campaignLevelBasics.steps.previewGoal.title"),
        description: translate("tutorials.campaignLevelBasics.steps.previewGoal.description"),
        target: tutorialSelector("play-preview-goal"),
        side: "bottom",
        align: "center"
      },
      {
        id: "play-program-surface",
        title: translate("tutorials.campaignLevelBasics.steps.programSurface.title"),
        description: translate("tutorials.campaignLevelBasics.steps.programSurface.description"),
        target: tutorialSelector("play-program-header"),
        side: "bottom",
        align: "start"
      },
      {
        id: "play-run-actions",
        title: translate("tutorials.campaignLevelBasics.steps.runActions.title"),
        description: translate("tutorials.campaignLevelBasics.steps.runActions.description"),
        target: tutorialSelector("play-run-actions"),
        side: "bottom",
        align: "end"
      },
      {
        id: "play-level-task",
        title: translate("tutorials.campaignLevelBasics.steps.levelTask.title"),
        description: translate("tutorials.campaignLevelBasics.steps.levelTask.description"),
        target: tutorialSelector("play-program-surface"),
        side: "bottom",
        align: "center"
      }
    ]
  }
  };

  return tutorials[tutorialId] ?? null;
};
