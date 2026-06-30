import { APP_ROUTES } from "../../types/routes";
import { t as translate } from "../../i18n-helpers";
import { getTutorialText } from "./tutorial-content";
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
  | "campaign-w1-l2-guided"
  | "campaign-w1-l3-guided"
  | "campaign-w2-l4-guided"
  | "campaign-w3-l3-guided"
  | "campaign-w4-l3-guided"
  | "campaign-world-basics";

export const getTutorial = (tutorialId: TutorialId): TutorialDefinition | null => {
  const appHomeBasics = getTutorialText("app-home-basics");
  const communityBasics = getTutorialText("community-basics");
  const editorDraftsBasics = getTutorialText("editor-drafts-basics");
  const settingsBasics = getTutorialText("settings-basics");
  const campaignW1L1Guided = getTutorialText("campaign-w1-l1-guided");
  const campaignW1L2Guided = getTutorialText("campaign-w1-l2-guided");
  const campaignW1L3Guided = getTutorialText("campaign-w1-l3-guided");
  const campaignW2L4Guided = getTutorialText("campaign-w2-l4-guided");
  const campaignW3L3Guided = getTutorialText("campaign-w3-l3-guided");
  const campaignW4L3Guided = getTutorialText("campaign-w4-l3-guided");
  const campaignWorldBasics = getTutorialText("campaign-world-basics");

  const tutorials: Record<TutorialId, TutorialDefinition> = {
    "app-home-basics": {
      id: "app-home-basics",
      label: appHomeBasics.label,
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
          title: appHomeBasics.steps["home-menu-card"].title,
          description: appHomeBasics.steps["home-menu-card"].description,
          target: tutorialSelector("home-menu-card"),
          side: "right",
          align: "center"
        },
        {
          id: "home-menu-campaign",
          title: appHomeBasics.steps["home-menu-campaign"].title,
          description: appHomeBasics.steps["home-menu-campaign"].description,
          target: `${tutorialSelector("home-menu-actions")} a[href="#${APP_ROUTES.campaign}"]`,
          side: "right",
          align: "center"
        },
        {
          id: "home-menu-community",
          title: appHomeBasics.steps["home-menu-community"].title,
          description: appHomeBasics.steps["home-menu-community"].description,
          target: `${tutorialSelector("home-menu-actions")} a[href="#${APP_ROUTES.play}"]`,
          side: "right",
          align: "center"
        },
        {
          id: "home-menu-editor",
          title: appHomeBasics.steps["home-menu-editor"].title,
          description: appHomeBasics.steps["home-menu-editor"].description,
          target: `${tutorialSelector("home-menu-actions")} a[href="#${APP_ROUTES.editor}"]`,
          side: "right",
          align: "center"
        },
        {
          id: "app-help-fab",
          title: appHomeBasics.steps["app-help-fab"].title,
          description: appHomeBasics.steps["app-help-fab"].description,
          target: tutorialSelector("app-help-fab"),
          side: "right",
          align: "center"
        }
      ]
    },
    "community-basics": {
      id: "community-basics",
      label: communityBasics.label,
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
          title: communityBasics.steps["community-search"].title,
          description: communityBasics.steps["community-search"].description,
          target: tutorialSelector("community-topbar"),
          side: "bottom",
          align: "start"
        },
        {
          id: "community-filters",
          title: communityBasics.steps["community-filters"].title,
          description: communityBasics.steps["community-filters"].description,
          target: tutorialSelector("community-filters"),
          side: "right",
          align: "start"
        },
        {
          id: "community-level-list",
          title: communityBasics.steps["community-level-list"].title,
          description: communityBasics.steps["community-level-list"].description,
          target: tutorialSelector("community-level-list"),
          side: "left",
          align: "start"
        },
        {
          id: "community-preview-play",
          title: communityBasics.steps["community-preview-play"].title,
          description: communityBasics.steps["community-preview-play"].description,
          target: tutorialSelector("community-preview-play"),
          side: "left",
          align: "center"
        }
      ]
    },
    "editor-drafts-basics": {
      id: "editor-drafts-basics",
      label: editorDraftsBasics.label,
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
          title: editorDraftsBasics.steps["editor-drafts-topbar"].title,
          description: editorDraftsBasics.steps["editor-drafts-topbar"].description,
          target: tutorialSelector("editor-drafts-topbar"),
          side: "bottom",
          align: "start"
        },
        {
          id: "editor-drafts-actions",
          title: editorDraftsBasics.steps["editor-drafts-actions"].title,
          description: editorDraftsBasics.steps["editor-drafts-actions"].description,
          target: tutorialSelector("editor-drafts-actions"),
          side: "bottom",
          align: "end"
        },
        {
          id: "editor-drafts-list",
          title: editorDraftsBasics.steps["editor-drafts-list"].title,
          description: editorDraftsBasics.steps["editor-drafts-list"].description,
          target: tutorialSelector("editor-drafts-list"),
          side: "top",
          align: "center"
        }
      ]
    },
    "settings-basics": {
      id: "settings-basics",
      label: settingsBasics.label,
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
          title: settingsBasics.steps["settings-preferences"].title,
          description: settingsBasics.steps["settings-preferences"].description,
          target: tutorialSelector("settings-preferences"),
          side: "right",
          align: "start"
        },
        {
          id: "settings-execution",
          title: settingsBasics.steps["settings-execution"].title,
          description: settingsBasics.steps["settings-execution"].description,
          target: tutorialSelector("settings-execution"),
          side: "right",
          align: "start"
        },
        {
          id: "settings-local-data",
          title: settingsBasics.steps["settings-local-data"].title,
          description: settingsBasics.steps["settings-local-data"].description,
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
    label: campaignW1L1Guided.label,
    route: `${APP_ROUTES.play}/:levelId`,
    presentation: "inline",
    dismissible: false,
    stagePadding: 12,
    stageRadius: 16,
    previousButtonText: translate("tutorials.common.back"),
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "w1-l1-intro-stack",
        title: campaignW1L1Guided.steps["w1-l1-intro-stack"].title,
        description: campaignW1L1Guided.steps["w1-l1-intro-stack"].description,
        target: tutorialSelector("play-board-visual"),
        inlineMode: "showcase",
        advanceOn: "anywhereClick",
        blockOutsideInteraction: true,
        side: "right",
        align: "start"
      },
      {
        id: "w1-l1-show-goal",
        title: campaignW1L1Guided.steps["w1-l1-show-goal"].title,
        description: campaignW1L1Guided.steps["w1-l1-show-goal"].description,
        target: tutorialSelector("play-preview-goal"),
        blockOutsideInteraction: true,
        advanceOn: "targetClick",
        side: "bottom",
        align: "center"
      },
      {
        id: "w1-l1-goal-explained",
        title: campaignW1L1Guided.steps["w1-l1-goal-explained"].title,
        description: campaignW1L1Guided.steps["w1-l1-goal-explained"].description,
        target: tutorialSelector("play-board-visual"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "anywhereClick",
        side: "right",
        align: "start"
      },
      {
        id: "w1-l1-show-current",
        title: campaignW1L1Guided.steps["w1-l1-show-current"].title,
        description: campaignW1L1Guided.steps["w1-l1-show-current"].description,
        target: tutorialSelector("play-preview-goal"),
        blockOutsideInteraction: true,
        advanceOn: "targetClick",
        side: "bottom",
        align: "center"
      },
      {
        id: "w1-l1-program-area",
        title: campaignW1L1Guided.steps["w1-l1-program-area"].title,
        description: campaignW1L1Guided.steps["w1-l1-program-area"].description,
        target: tutorialSelector("editor-program-host"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "anywhereClick",
        side: "left",
        align: "center"
      },
      {
        id: "w1-l1-palette-structure",
        title: campaignW1L1Guided.steps["w1-l1-palette-structure"].title,
        description: campaignW1L1Guided.steps["w1-l1-palette-structure"].description,
        target: tutorialSelector("editor-palette-side-body"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "anywhereClick",
        side: "right",
        align: "center"
      },
      {
        id: "w1-l1-place-structure",
        title: campaignW1L1Guided.steps["w1-l1-place-structure"].title,
        description: campaignW1L1Guided.steps["w1-l1-place-structure"].description,
      target: tutorialSelector("editor-palette-side-structure-A"),
      arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l1:structure-placed",
        allowInteraction: true
      },
      {
        id: "w1-l1-choose-operation",
        title: campaignW1L1Guided.steps["w1-l1-choose-operation"].title,
        description: campaignW1L1Guided.steps["w1-l1-choose-operation"].description,
        target: tutorialSelector("play-program-surface"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "left",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l1:operation-selected",
        allowInteraction: true
      },
      {
        id: "w1-l1-run-controls",
        title: campaignW1L1Guided.steps["w1-l1-run-controls"].title,
        description: campaignW1L1Guided.steps["w1-l1-run-controls"].description,
        target: tutorialSelector("play-run-actions"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "end",
        advanceOn: "anywhereClick"
      },
      {
        id: "w1-l1-run-program",
        title: campaignW1L1Guided.steps["w1-l1-run-program"].title,
        description: campaignW1L1Guided.steps["w1-l1-run-program"].description,
        target: tutorialSelector("play-run-button"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "end",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l1:run-pressed",
        allowInteraction: true
      },
      {
        id: "w1-l1-executing",
        title: campaignW1L1Guided.steps["w1-l1-executing"].title,
        description: campaignW1L1Guided.steps["w1-l1-executing"].description,
        target: tutorialSelector("play-board-visual"),
        inlineMode: "showcase",
        hideCard: true,
        blockOutsideInteraction: true,
        side: "left",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l1:level-solved"
      }
    ]
  },
  "campaign-w1-l2-guided": {
    id: "campaign-w1-l2-guided",
    label: campaignW1L2Guided.label,
    route: `${APP_ROUTES.play}/:levelId`,
    presentation: "inline",
    dismissible: false,
    stagePadding: 12,
    stageRadius: 16,
    previousButtonText: translate("tutorials.common.back"),
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "w1-l2-intro",
        title: campaignW1L2Guided.steps["w1-l2-intro"].title,
        description: campaignW1L2Guided.steps["w1-l2-intro"].description,
        target: tutorialSelector("play-board-visual"),
        inlineMode: "showcase",
        advanceOn: "anywhereClick",
        blockOutsideInteraction: true,
        side: "right",
        align: "start"
      },
      {
        id: "w1-l2-place-two-stacks",
        title: campaignW1L2Guided.steps["w1-l2-place-two-stacks"].title,
        description: campaignW1L2Guided.steps["w1-l2-place-two-stacks"].description,
      target: tutorialSelector("editor-palette-side-structure-A"),
      arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l2:structures-ready",
        allowInteraction: true
      },
      {
        id: "w1-l2-choose-pop-twice",
        title: campaignW1L2Guided.steps["w1-l2-choose-pop-twice"].title,
        description: campaignW1L2Guided.steps["w1-l2-choose-pop-twice"].description,
        target: tutorialSelector("play-program-surface"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "left",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l2:operations-ready",
        allowInteraction: true
      },
      {
        id: "w1-l2-step-once",
        title: campaignW1L2Guided.steps["w1-l2-step-once"].title,
        description: campaignW1L2Guided.steps["w1-l2-step-once"].description,
        target: tutorialSelector("play-step-button"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "end",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l2:step-pressed",
        allowInteraction: true
      },
      {
        id: "w1-l2-step-result",
        title: campaignW1L2Guided.steps["w1-l2-step-result"].title,
        description: campaignW1L2Guided.steps["w1-l2-step-result"].description,
        target: tutorialSelector("play-board-visual"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "anywhereClick",
        side: "right",
        align: "start"
      },
      {
        id: "w1-l2-reset",
        title: campaignW1L2Guided.steps["w1-l2-reset"].title,
        description: campaignW1L2Guided.steps["w1-l2-reset"].description,
        target: tutorialSelector("play-reset-button"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "end",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l2:reset-pressed",
        allowInteraction: true
      },
      {
        id: "w1-l2-finish",
        title: campaignW1L2Guided.steps["w1-l2-finish"].title,
        description: campaignW1L2Guided.steps["w1-l2-finish"].description,
        target: tutorialSelector("play-run-button"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "end",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l2:run-pressed",
        allowInteraction: true
      },
      {
        id: "w1-l2-executing",
        title: campaignW1L2Guided.steps["w1-l2-executing"].title,
        description: campaignW1L2Guided.steps["w1-l2-executing"].description,
        target: tutorialSelector("play-board-visual"),
        inlineMode: "showcase",
        hideCard: true,
        blockOutsideInteraction: true,
        side: "left",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l2:level-solved"
      }
    ]
  },
  "campaign-w1-l3-guided": {
    id: "campaign-w1-l3-guided",
    label: campaignW1L3Guided.label,
    route: `${APP_ROUTES.play}/:levelId`,
    presentation: "inline",
    dismissible: false,
    stagePadding: 12,
    stageRadius: 16,
    previousButtonText: translate("tutorials.common.back"),
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "w1-l3-read-description",
        title: campaignW1L3Guided.steps["w1-l3-read-description"].title,
        description: campaignW1L3Guided.steps["w1-l3-read-description"].description,
        target: tutorialSelector("play-level-description"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "anywhereClick",
        side: "bottom",
        align: "center"
      },
      {
        id: "w1-l3-place-queue",
        title: campaignW1L3Guided.steps["w1-l3-place-queue"].title,
        description: campaignW1L3Guided.steps["w1-l3-place-queue"].description,
      target: tutorialSelector("editor-palette-side-structure-A"),
      arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l3:structure-placed",
        allowInteraction: true
      },
      {
        id: "w1-l3-choose-enqueue",
        title: campaignW1L3Guided.steps["w1-l3-choose-enqueue"].title,
        description: campaignW1L3Guided.steps["w1-l3-choose-enqueue"].description,
        target: tutorialSelector("play-program-surface"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "left",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l3:enqueue-selected",
        allowInteraction: true
      },
      {
        id: "w1-l3-run-incomplete",
        title: campaignW1L3Guided.steps["w1-l3-run-incomplete"].title,
        description: campaignW1L3Guided.steps["w1-l3-run-incomplete"].description,
        target: tutorialSelector("play-run-button"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "end",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l3:first-run-pressed",
        allowInteraction: true
      },
      {
        id: "w1-l3-output-feedback",
        title: campaignW1L3Guided.steps["w1-l3-output-feedback"].title,
        description: campaignW1L3Guided.steps["w1-l3-output-feedback"].description,
        target: tutorialSelector("play-output-panel"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "anywhereClick",
        side: "top",
        align: "center"
      },
      {
        id: "w1-l3-left-palette",
        title: campaignW1L3Guided.steps["w1-l3-left-palette"].title,
        description: campaignW1L3Guided.steps["w1-l3-left-palette"].description,
        target: tutorialSelector("editor-palette-group-expressions"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l3:expressions-opened",
        side: "right",
        align: "center"
      },
      {
        id: "w1-l3-place-literal",
        title: campaignW1L3Guided.steps["w1-l3-place-literal"].title,
        description: campaignW1L3Guided.steps["w1-l3-place-literal"].description,
        target: tutorialSelector("editor-palette-base-literal"),
        arrowTarget: () =>
          document.querySelector(
            `${tutorialSelector("play-program-surface")} .editor-block-instance-cavity:not(.filled)`
          ),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "start",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l3:literal-placed",
        allowInteraction: true
      },
      {
        id: "w1-l3-finish",
        title: campaignW1L3Guided.steps["w1-l3-finish"].title,
        description: campaignW1L3Guided.steps["w1-l3-finish"].description,
        target: tutorialSelector("play-run-button"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "end",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l3:final-run-pressed",
        allowInteraction: true
      },
      {
        id: "w1-l3-executing",
        title: campaignW1L3Guided.steps["w1-l3-executing"].title,
        description: campaignW1L3Guided.steps["w1-l3-executing"].description,
        target: tutorialSelector("play-board-visual"),
        inlineMode: "showcase",
        hideCard: true,
        blockOutsideInteraction: true,
        side: "left",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w1-l3:level-solved"
      }
    ]
  },
  "campaign-w2-l4-guided": {
    id: "campaign-w2-l4-guided",
    label: campaignW2L4Guided.label,
    route: `${APP_ROUTES.play}/:levelId`,
    presentation: "inline",
    dismissible: false,
    stagePadding: 12,
    stageRadius: 16,
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "w2-l4-intro",
        title: campaignW2L4Guided.steps["w2-l4-intro"].title,
        description: campaignW2L4Guided.steps["w2-l4-intro"].description,
        target: tutorialSelector("play-board-visual"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "anywhereClick",
        side: "right",
        align: "start"
      },
      {
        id: "w2-l4-place-if",
        title: campaignW2L4Guided.steps["w2-l4-place-if"].title,
        description: campaignW2L4Guided.steps["w2-l4-place-if"].description,
        target: tutorialSelector("editor-palette-base-body"),
        arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w2-l4:conditional-placed",
        allowInteraction: true
      },
      {
        id: "w2-l4-build-condition",
        title: campaignW2L4Guided.steps["w2-l4-build-condition"].title,
        description: campaignW2L4Guided.steps["w2-l4-build-condition"].description,
        target: tutorialSelector("editor-palette-base-body"),
        arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w2-l4:comparison-ready",
        allowInteraction: true
      },
      {
        id: "w2-l4-build-transfer",
        title: campaignW2L4Guided.steps["w2-l4-build-transfer"].title,
        description: campaignW2L4Guided.steps["w2-l4-build-transfer"].description,
        target: tutorialSelector("editor-palette-side-body"),
        arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w2-l4:body-ready",
        allowInteraction: true
      }
    ]
  },
  "campaign-w3-l3-guided": {
    id: "campaign-w3-l3-guided",
    label: campaignW3L3Guided.label,
    route: `${APP_ROUTES.play}/:levelId`,
    presentation: "inline",
    dismissible: false,
    stagePadding: 12,
    stageRadius: 16,
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "w3-l3-intro",
        title: campaignW3L3Guided.steps["w3-l3-intro"].title,
        description: campaignW3L3Guided.steps["w3-l3-intro"].description,
        target: tutorialSelector("play-board-visual"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "anywhereClick",
        side: "right",
        align: "start"
      },
      {
        id: "w3-l3-place-while",
        title: campaignW3L3Guided.steps["w3-l3-place-while"].title,
        description: campaignW3L3Guided.steps["w3-l3-place-while"].description,
        target: tutorialSelector("editor-palette-base-body"),
        arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w3-l3:while-placed",
        allowInteraction: true
      },
      {
        id: "w3-l3-build-condition",
        title: campaignW3L3Guided.steps["w3-l3-build-condition"].title,
        description: campaignW3L3Guided.steps["w3-l3-build-condition"].description,
        target: tutorialSelector("editor-palette-base-body"),
        arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w3-l3:condition-ready",
        allowInteraction: true
      },
      {
        id: "w3-l3-build-loop-body",
        title: campaignW3L3Guided.steps["w3-l3-build-loop-body"].title,
        description: campaignW3L3Guided.steps["w3-l3-build-loop-body"].description,
        target: tutorialSelector("editor-palette-side-body"),
        arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w3-l3:body-ready",
        allowInteraction: true
      }
    ]
  },
  "campaign-w4-l3-guided": {
    id: "campaign-w4-l3-guided",
    label: campaignW4L3Guided.label,
    route: `${APP_ROUTES.play}/:levelId`,
    presentation: "inline",
    dismissible: false,
    stagePadding: 12,
    stageRadius: 16,
    closeButtonText: translate("tutorials.common.close"),
    steps: [
      {
        id: "w4-l3-intro",
        title: campaignW4L3Guided.steps["w4-l3-intro"].title,
        description: campaignW4L3Guided.steps["w4-l3-intro"].description,
        target: tutorialSelector("play-level-description"),
        inlineMode: "showcase",
        blockOutsideInteraction: true,
        advanceOn: "anywhereClick",
        side: "bottom",
        align: "center"
      },
      {
        id: "w4-l3-create-helper",
        title: campaignW4L3Guided.steps["w4-l3-create-helper"].title,
        description: campaignW4L3Guided.steps["w4-l3-create-helper"].description,
        target: () => document.querySelector(".ide-topbar-tabs .routine-chip-add"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w4-l3:helper-created",
        allowInteraction: true
      },
      {
        id: "w4-l3-place-definition",
        title: campaignW4L3Guided.steps["w4-l3-place-definition"].title,
        description: campaignW4L3Guided.steps["w4-l3-place-definition"].description,
        target: tutorialSelector("editor-palette-base-body"),
        arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "right",
        align: "center",
        advanceOn: "event",
        advanceOnEvent: "campaign:w4-l3:definition-placed",
        allowInteraction: true
      },
      {
        id: "w4-l3-build-helper-body",
        title: campaignW4L3Guided.steps["w4-l3-build-helper-body"].title,
        description: campaignW4L3Guided.steps["w4-l3-build-helper-body"].description,
        target: tutorialSelector("editor-palette-side-body"),
        arrowTarget: tutorialSelector("editor-program-body"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "bottom",
        align: "start",
        advanceOn: "event",
        advanceOnEvent: "campaign:w4-l3:helper-logic-ready",
        allowInteraction: true
      },
      {
        id: "w4-l3-call-helper-from-main",
        title: campaignW4L3Guided.steps["w4-l3-call-helper-from-main"].title,
        description: campaignW4L3Guided.steps["w4-l3-call-helper-from-main"].description,
        target: tutorialSelector("editor-ide-panel"),
        inlineMode: "interactive",
        blockOutsideInteraction: true,
        side: "left",
        align: "start",
        advanceOn: "event",
        advanceOnEvent: "campaign:w4-l3:main-call-ready",
        allowInteraction: true
      }
    ]
  },
  "campaign-world-basics": {
    id: "campaign-world-basics",
    label: campaignWorldBasics.label,
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
        title: campaignWorldBasics.steps["campaign-world-strip"].title,
        description: campaignWorldBasics.steps["campaign-world-strip"].description,
        target: tutorialSelector("campaign-world-strip"),
        side: "bottom",
        align: "start"
      },
      {
        id: "campaign-map-shell",
        title: campaignWorldBasics.steps["campaign-map-shell"].title,
        description: campaignWorldBasics.steps["campaign-map-shell"].description,
        target: tutorialSelector("campaign-map-shell"),
        side: "left",
        align: "center"
      },
      {
        id: "campaign-sidepanel",
        title: campaignWorldBasics.steps["campaign-sidepanel"].title,
        description: campaignWorldBasics.steps["campaign-sidepanel"].description,
        target: tutorialSelector("campaign-sidepanel"),
        side: "left",
        align: "center"
      }
    ]
  }
  };

  return tutorials[tutorialId] ?? null;
};
