import { APP_ROUTES } from "../../types/routes";
import { t as translate } from "../../i18n-helpers";
import { tutorialSelector } from "./anchors";
import type { TutorialDefinition } from "./types";

export type TutorialId =
  | "app-home-basics"
  | "community-basics"
  | "editor-drafts-basics"
  | "settings-basics"
  | "editor-basics"
  | "campaign-level-basics"
  | "campaign-w1-l1-guided"
  | "campaign-world-basics";

export const getTutorial = (tutorialId: TutorialId): TutorialDefinition | null => {
  const tutorials: Record<TutorialId, TutorialDefinition> = {
    "app-home-basics": {
      id: "app-home-basics",
      label: "App home basics",
      route: APP_ROUTES.home,
      overlayOpacity: 0.68,
      stagePadding: 12,
      stageRadius: 16,
      nextButtonText: translate("tutorials.common.next"),
      previousButtonText: translate("tutorials.common.back"),
      closeButtonText: translate("tutorials.common.close"),
      steps: [
        {
          id: "home-menu-card",
          title: "Main entry point",
          description: "This is the main menu. From here you choose how you want to use the software.",
          target: tutorialSelector("home-menu-card"),
          side: "right",
          align: "center"
        },
        {
          id: "home-menu-campaign",
          title: "Campaign Mode",
          description: "Campaign is the guided path. It is the best place to start, and you should try it first until you get familiar with the software.",
          target: `${tutorialSelector("home-menu-actions")} a[href="#${APP_ROUTES.campaign}"]`,
          side: "right",
          align: "center"
        },
        {
          id: "home-menu-community",
          title: "Community Levels",
          description: "Community Levels let you explore and play existing levels more freely, without following the campaign order.",
          target: `${tutorialSelector("home-menu-actions")} a[href="#${APP_ROUTES.play}"]`,
          side: "right",
          align: "center"
        },
        {
          id: "home-menu-editor",
          title: "Level Editor",
          description: "The Level Editor is where you build, test, and publish your own levels once you are comfortable with the tool.",
          target: `${tutorialSelector("home-menu-actions")} a[href="#${APP_ROUTES.editor}"]`,
          side: "right",
          align: "center"
        },
        {
          id: "app-help-fab",
          title: "Need help again?",
          description: "You can always click this ? button to replay the guide and get help later.",
          target: tutorialSelector("app-help-fab"),
          side: "right",
          align: "center"
        }
      ]
    },
    "community-basics": {
      id: "community-basics",
      label: "Community levels basics",
      route: APP_ROUTES.play,
      overlayOpacity: 0.7,
      stagePadding: 12,
      stageRadius: 16,
      nextButtonText: translate("tutorials.common.next"),
      previousButtonText: translate("tutorials.common.back"),
      closeButtonText: translate("tutorials.common.close"),
      steps: [
        {
          id: "community-search",
          title: "Find a level",
          description: "Use search, import, and sorting here to find the kind of level you want to play.",
          target: tutorialSelector("community-topbar"),
          side: "bottom",
          align: "start"
        },
        {
          id: "community-filters",
          title: "Filter the catalog",
          description: "These filters narrow the list by source, structure, difficulty, and completion state.",
          target: tutorialSelector("community-filters"),
          side: "right",
          align: "start"
        },
        {
          id: "community-level-list",
          title: "Choose a level",
          description: "Select any card in the catalog to inspect it before playing.",
          target: tutorialSelector("community-level-list"),
          side: "left",
          align: "start"
        },
        {
          id: "community-preview-play",
          title: "Execute the selected level",
          description: "After selecting a level, review its preview here and press Play to open and execute that level.",
          target: tutorialSelector("community-preview-play"),
          side: "left",
          align: "center"
        }
      ]
    },
    "editor-drafts-basics": {
      id: "editor-drafts-basics",
      label: "Editor drafts basics",
      route: APP_ROUTES.editor,
      overlayOpacity: 0.7,
      stagePadding: 12,
      stageRadius: 16,
      nextButtonText: translate("tutorials.common.next"),
      previousButtonText: translate("tutorials.common.back"),
      closeButtonText: translate("tutorials.common.close"),
      steps: [
        {
          id: "editor-drafts-topbar",
          title: "Editor entry point",
          description: "This screen manages your saved level drafts and campaign scaffolds.",
          target: tutorialSelector("editor-drafts-topbar"),
          side: "bottom",
          align: "start"
        },
        {
          id: "editor-drafts-actions",
          title: "Create or scaffold",
          description: "Use these actions to create a new level or generate the planned campaign draft structure.",
          target: tutorialSelector("editor-drafts-actions"),
          side: "bottom",
          align: "end"
        },
        {
          id: "editor-drafts-list",
          title: "Open existing drafts",
          description: "Each card is a saved level draft. Open one to continue editing or remove it if you no longer need it.",
          target: tutorialSelector("editor-drafts-list"),
          side: "top",
          align: "center"
        }
      ]
    },
    "settings-basics": {
      id: "settings-basics",
      label: "Settings basics",
      route: APP_ROUTES.settings,
      overlayOpacity: 0.7,
      stagePadding: 12,
      stageRadius: 16,
      nextButtonText: translate("tutorials.common.next"),
      previousButtonText: translate("tutorials.common.back"),
      closeButtonText: translate("tutorials.common.close"),
      steps: [
        {
          id: "settings-preferences",
          title: "Preferences",
          description: "Here you control language and other shared interface preferences.",
          target: tutorialSelector("settings-preferences"),
          side: "right",
          align: "start"
        },
        {
          id: "settings-execution",
          title: "Execution speed",
          description: "Adjust the visible runtime speed to make step-by-step behavior easier or faster to inspect.",
          target: tutorialSelector("settings-execution"),
          side: "right",
          align: "start"
        },
        {
          id: "settings-local-data",
          title: "Local data management",
          description: "These actions export, import, or clear local progress, drafts, and preferences stored in the browser.",
          target: tutorialSelector("settings-local-data"),
          side: "left",
          align: "start"
        }
      ]
    },
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
  },
  "campaign-w1-l1-guided": {
    id: "campaign-w1-l1-guided",
    label: "Campaign W1-L1 guided",
    route: `${APP_ROUTES.play}/:levelId`,
    dismissible: false,
    overlayOpacity: 0.76,
    stagePadding: 12,
    stageRadius: 16,
    previousButtonText: translate("tutorials.common.back"),
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "w1-l1-preview-goal",
        title: "Read the boards first",
        description: "Compare the current board with the goal. The top value of stack A must disappear, so keep that change in mind before touching the editor.",
        target: tutorialSelector("play-preview-goal"),
        side: "bottom",
        align: "center",
        nextButtonText: "I see it"
      },
      {
        id: "w1-l1-place-structure",
        title: "Place stack A in the program",
        description: "Drag stack A into the program area. The guide will stay here until the block is actually placed.",
        target: tutorialSelector("editor-ide-panel"),
        side: "left",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l1:structure-placed",
        allowInteraction: true
      },
      {
        id: "w1-l1-choose-operation",
        title: "Choose one operation",
        description: "Now pick an operation for that stack block. Both options are visible, but only one changes the board.",
        target: tutorialSelector("editor-ide-panel"),
        side: "left",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l1:operation-selected",
        allowInteraction: true
      },
      {
        id: "w1-l1-run-program",
        title: "Execute the program",
        description: "Press Play to run your program. After it runs, the guide will move on automatically.",
        target: tutorialSelector("play-run-actions"),
        side: "bottom",
        align: "end",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l1:run-pressed",
        allowInteraction: true
      },
      {
        id: "w1-l1-observe-board",
        title: "Observe the result",
        description: "Watch the board and compare it with the goal. If you chose the wrong operation, try again and notice what changed.",
        target: tutorialSelector("play-board-header"),
        side: "left",
        align: "center",
        nextButtonText: "Continue"
      }
    ]
  },
  "campaign-world-basics": {
    id: "campaign-world-basics",
    label: "Campaign world basics",
    route: APP_ROUTES.campaign,
    overlayOpacity: 0.72,
    stagePadding: 12,
    stageRadius: 16,
    nextButtonText: translate("tutorials.common.next"),
    previousButtonText: translate("tutorials.common.back"),
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "campaign-world-strip",
        title: "World progression",
        description: "These nodes switch between worlds. Each world unlocks after finishing the previous one.",
        target: tutorialSelector("campaign-world-strip"),
        side: "bottom",
        align: "start"
      },
      {
        id: "campaign-map-shell",
        title: "Move through the map",
        description: "Click an unlocked level to move there. Then use the side panel or click the same level again to start playing.",
        target: tutorialSelector("campaign-map-shell"),
        side: "left",
        align: "center"
      },
      {
        id: "campaign-sidepanel",
        title: "Level details",
        description: "This panel shows the current level information and lets you press Play when you are ready.",
        target: tutorialSelector("campaign-sidepanel"),
        side: "left",
        align: "center"
      }
    ]
  }
  };

  return tutorials[tutorialId] ?? null;
};
