import type { Alignment, Side } from "driver.js";
import type { TutorialTarget } from "./anchors";

export type TutorialAdvanceMode = "next" | "targetClick" | "event" | "anywhereClick";
export type TutorialPresentation = "overlay" | "inline";
export type TutorialInlineStepMode = "interactive" | "showcase";

export interface TutorialStepDefinition {
  id: string;
  title: string;
  description: string;
  target: TutorialTarget;
  arrowTarget?: TutorialTarget;
  inlineMode?: TutorialInlineStepMode;
  hideCard?: boolean;
  blockOutsideInteraction?: boolean;
  side?: Side;
  align?: Alignment;
  advanceOn?: TutorialAdvanceMode;
  advanceOnEvent?: string;
  allowInteraction?: boolean;
  padding?: number;
  timeoutMs?: number;
  nextButtonText?: string;
  previousButtonText?: string;
  closeButtonText?: string;
}

export interface TutorialDefinition {
  id: string;
  label: string;
  route?: string;
  steps: TutorialStepDefinition[];
  presentation?: TutorialPresentation;
  dismissible?: boolean;
  overlayOpacity?: number;
  stagePadding?: number;
  stageRadius?: number;
  nextButtonText?: string;
  previousButtonText?: string;
  closeButtonText?: string;
}
