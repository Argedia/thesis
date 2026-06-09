import { APP_ROUTES } from "../../types/routes";
import { tutorialSelector } from "./anchors";
import type { TutorialDefinition } from "./types";

export const tutorials = {
  "editor-basics": {
    id: "editor-basics",
    label: "Editor basics",
    route: `${APP_ROUTES.editor}/:draftId`,
    overlayOpacity: 0.7,
    stagePadding: 10,
    stageRadius: 16,
    nextButtonText: "Next",
    previousButtonText: "Back",
    closeButtonText: "Close",
    steps: [
      {
        id: "editor-actions",
        title: "Top actions",
        description: "Core draft actions stay here: export, test, save, publish, and this tutorial entrypoint.",
        target: tutorialSelector("editor-actions"),
        side: "bottom",
        align: "end"
      },
      {
        id: "editor-palette-base",
        title: "Main palette",
        description: "Drag building blocks from this palette into the program surface.",
        target: tutorialSelector("editor-palette-base"),
        side: "right",
        align: "start"
      },
      {
        id: "editor-program-body",
        title: "Program surface",
        description: "This surface is the editable program. Blocks, inline inputs, and control flow all render here.",
        target: tutorialSelector("editor-program-body"),
        side: "left",
        align: "start"
      },
      {
        id: "editor-board-config-button",
        title: "Board rules",
        description: "Click this control to open the board and restriction settings. This step advances after the click.",
        target: tutorialSelector("editor-board-config-button"),
        side: "left",
        align: "center",
        advanceOn: "targetClick"
      },
      {
        id: "editor-board-config-panel",
        title: "Restrictions panel",
        description: "This panel configures allowed operations, block limits, and validation rules for the level.",
        target: tutorialSelector("editor-board-config-panel"),
        side: "left",
        align: "start",
        allowInteraction: true,
        timeoutMs: 8000
      },
      {
        id: "editor-palette-side",
        title: "Context palette",
        description: "Scope variables, created values, and routine-specific helpers appear here.",
        target: tutorialSelector("editor-palette-side"),
        side: "left",
        align: "start"
      }
    ]
  }
} satisfies Record<string, TutorialDefinition>;

export type TutorialId = keyof typeof tutorials;
