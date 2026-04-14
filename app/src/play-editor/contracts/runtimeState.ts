import type { ControlBodyKey, EditorDragState } from "../model";
import type { PendingPress, WheelState } from "./types";

export interface BranchLineRef {
  ownerId: string;
  branch: ControlBodyKey;
  depth: number;
  element: HTMLDivElement;
  isLast: boolean;
}

export interface EditorRuntimeState {
  blockRefs: Map<string, HTMLDivElement>;
  lineRowRefs: Map<string, HTMLDivElement>;
  slotRefs: Map<string, HTMLDivElement>;
  branchLineRefs: BranchLineRef[];
  editorLane: HTMLDivElement | null;
  dragState: EditorDragState | null;
  dragBaseLineRects: Array<{ id: string; rect: DOMRect }> | null;
  pressState: PendingPress | null;
  wheelState: WheelState | null;
}
