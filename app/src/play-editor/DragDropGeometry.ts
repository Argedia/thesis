import type { EditorBlock, EditorDragState, EditorLineLayout, ControlBodyKey } from "./model";
import type { DragGeometry } from "./layout";
import type { ResolvedDropPlacement } from "./contracts/types";
import { calculateDropIndex } from "./layout";
import { INDENT_STEP_PX } from "../features/program-editor-core/editor-layout-constants";

export function ghostGeometry(
	pointerX: number,
	pointerY: number,
	offsetX: number,
	offsetY: number,
	width: number,
	height: number,
	source: "palette" | "program" = "palette"
): DragGeometry {
	const left = pointerX - offsetX;
	const top = pointerY - offsetY;
	const placementX = left + Math.min(Math.max(width * 0.12, 10), 22);
	const verticalRatio = source === "program" ? 0.54 : 0.38;
	const placementY = top + Math.min(Math.max(height * verticalRatio, 18), Math.max(height - 18, 18));

	return {
		left,
		top,
		right: left + width,
		bottom: top + height,
		width,
		height,
		placementX,
		placementY
	};
}

type ControlEditorBlock = EditorBlock & { kind: "conditional" | "else" | "while" | "for_each" };
type BranchTarget = { ownerId: string; branch: ControlBodyKey };

const SENTINEL: Pick<EditorLineLayout, "indentCurrent" | "opensBody" | "controlPath" | "blockId" | "role"> = {
	indentCurrent: 0,
	opensBody: false,
	controlPath: [],
	blockId: undefined,
	role: "block"
};

export class DragDropGeometryService {
	constructor(
		private editorLane: HTMLDivElement | null,
		private lineRowRefs: Map<string, HTMLDivElement>,
		private slotRefs: Map<string, HTMLDivElement>,
		private dragState: EditorDragState | null,
		private dragBaseLineRects: Array<{ id: string; rect: DOMRect }> | null,
		private parseSlotKey: (key: string) => { ownerId: string; slotId: string },
		private canUseSlotTarget: (targetSlotKey: string) => boolean,
		private findBlockById: (blocks: EditorBlock[], blockId: string) => EditorBlock | null,
		private isControlBlock: (block: EditorBlock | null | undefined) => block is ControlEditorBlock,
		private getBlocks: () => EditorBlock[]
	) { }

	getLineRects(lineLayouts: EditorLineLayout[]): Array<{ id: string; rect: DOMRect }> {
		return lineLayouts
			.map((lineLayout) => {
				const element = this.lineRowRefs.get(lineLayout.id);
				return element ? { id: lineLayout.id, rect: element.getBoundingClientRect() } : null;
			})
			.filter((value): value is { id: string; rect: DOMRect } => value !== null)
			.sort((left, right) => left.rect.top - right.rect.top);
	}

	captureBaseLineRects(lineLayouts: EditorLineLayout[]): Array<{ id: string; rect: DOMRect }> {
		return this.getLineRects(lineLayouts);
	}

	currentDropWithPoint(
		drag: DragGeometry,
		lineLayouts: EditorLineLayout[]
	): { index: number; rowIndex: number; isOverEditor: boolean } {
		const { index: rowIndex, isOverEditor } = calculateDropIndex(
			drag,
			this.editorLane?.getBoundingClientRect(),
			this.dragBaseLineRects ?? this.getLineRects(lineLayouts),
			lineLayouts.length,
			this.dragState?.rowIndex ?? null
		);

		if (rowIndex >= lineLayouts.length) {
			return {
				index: this.getBlocks().length,
				rowIndex,
				isOverEditor
			};
		}

		return {
			index: lineLayouts[rowIndex].topLevelIndex ?? this.getBlocks().length,
			rowIndex,
			isOverEditor
		};
	}

	currentIndentChoice(
		pointerX: number,
		rowIndex: number,
		lineLayouts: EditorLineLayout[]
	): number {
		const laneLeft = this.editorLane?.getBoundingClientRect().left ?? 0;
		const targetLine =
			rowIndex < lineLayouts.length
				? lineLayouts[rowIndex]
				: lineLayouts[lineLayouts.length - 1] ?? null;
		const previousLine =
			rowIndex > 0 ? lineLayouts[Math.min(rowIndex - 1, lineLayouts.length - 1)] : null;

		if (!targetLine) {
			return 0;
		}

		// Gap is above lineLayouts[rowIndex]:
		// prevLine = lineLayouts[rowIndex - 1] ?? SENTINEL
		// nextLine = lineLayouts[rowIndex] ?? SENTINEL (same as targetLine here)
		const prevLine = previousLine ?? SENTINEL;
		const nextLine = targetLine;

		const maxIndent = prevLine.indentCurrent + (prevLine.opensBody ? 1 : 0);
		const minIndent = nextLine.indentCurrent;

		const rawIndent = Math.floor((pointerX - laneLeft) / INDENT_STEP_PX);
		return Math.min(Math.max(rawIndent, minIndent), maxIndent);
	}

	resolveDropPlacement(
		blocks: EditorBlock[],
		lineLayouts: EditorLineLayout[],
		rowIndex: number,
		chosenIndent: number
	): ResolvedDropPlacement {
		// Gap above lineLayouts[rowIndex]
		const prevLine = rowIndex > 0 ? lineLayouts[rowIndex - 1] : null;
		const nextLine = rowIndex < lineLayouts.length ? lineLayouts[rowIndex] : null;

		const prev = prevLine ?? SENTINEL;

		// Dropping into prevLine's body (control or else_header opens a body)
		if (chosenIndent === prev.indentCurrent + 1 && prev.opensBody && prevLine) {
			return {
				branchTarget: {
					ownerId: prevLine.blockId!,
					branch: prevLine.role === "else_header" ? "alternateBody" : "body"
				}
			};
		}

		// Dropping into a known control body via controlPath
		if (chosenIndent > 0 && prev.controlPath.length >= chosenIndent) {
			const pathEntry = prev.controlPath[chosenIndent - 1];
			if (pathEntry) {
				return {
					branchTarget: pathEntry,
					beforeBlockId: nextLine?.blockId
				};
			}
		}

		// Dropping at root or unresolved — use topLevelIndex of the next line
		if (nextLine) {
			return {
				rootIndex: nextLine.topLevelIndex ?? blocks.length
			};
		}

		return { rootIndex: blocks.length };
	}

	currentSlotTarget(drag: DragGeometry): string | null {
		const enterThreshold = 0.45;
		const leaveThreshold = 0.2;
		const originReenterThreshold = 0.78;
		const slotRects = Array.from(this.slotRefs.entries()).map(([slotKey, element]) => ({
			slotKey,
			rect: element.getBoundingClientRect()
		}));

		const overlapRatio = (rect: DOMRect): number => {
			const overlapLeft = Math.max(drag.left, rect.left);
			const overlapTop = Math.max(drag.top, rect.top);
			const overlapRight = Math.min(drag.right, rect.right);
			const overlapBottom = Math.min(drag.bottom, rect.bottom);
			const overlapWidth = Math.max(0, overlapRight - overlapLeft);
			const overlapHeight = Math.max(0, overlapBottom - overlapTop);
			const overlapArea = overlapWidth * overlapHeight;
			if (overlapArea <= 0) {
				return 0;
			}
			const slotArea = Math.max(rect.width * rect.height, 1);
			return overlapArea / slotArea;
		};

		const previousSlotId = this.dragState?.slotTargetKey ?? null;
		const originSlotOwnerId = this.dragState?.originSlotOwnerId ?? null;
		const centerX = drag.left + drag.width / 2;
		const centerY = drag.top + drag.height / 2;

		const centerContainedSlot = slotRects.find(
			(slot) =>
				this.canUseSlotTarget(slot.slotKey) &&
				this.parseSlotKey(slot.slotKey).ownerId !== originSlotOwnerId &&
				centerX >= slot.rect.left &&
				centerX <= slot.rect.right &&
				centerY >= slot.rect.top &&
				centerY <= slot.rect.bottom &&
				overlapRatio(slot.rect) >= enterThreshold
		);
		if (centerContainedSlot) {
			return centerContainedSlot.slotKey;
		}

		let preservedPreviousSlotId: string | null = null;
		if (previousSlotId) {
			const previousSlot = slotRects.find((slot) => slot.slotKey === previousSlotId);
			if (
				previousSlot &&
				this.canUseSlotTarget(previousSlot.slotKey) &&
				this.parseSlotKey(previousSlot.slotKey).ownerId !== originSlotOwnerId &&
				overlapRatio(previousSlot.rect) >= leaveThreshold
			) {
				preservedPreviousSlotId = previousSlotId;
			}
		}

		let bestSlotId: string | null = null;
		let bestOverlap = 0;

		slotRects.forEach((slot) => {
			if (!this.canUseSlotTarget(slot.slotKey)) {
				return;
			}
			const ratio = overlapRatio(slot.rect);
			const requiredThreshold =
				this.parseSlotKey(slot.slotKey).ownerId === originSlotOwnerId ? originReenterThreshold : enterThreshold;
			if (ratio >= requiredThreshold && ratio > bestOverlap) {
				bestSlotId = slot.slotKey;
				bestOverlap = ratio;
			}
		});

		return bestSlotId ?? preservedPreviousSlotId;
	}

	currentBranchTarget(
		blocks: EditorBlock[],
		rowIndex: number,
		lineLayouts: EditorLineLayout[],
		chosenIndent: number
	): BranchTarget | null {
		return this.resolveDropPlacement(blocks, lineLayouts, rowIndex, chosenIndent).branchTarget ?? null;
	}

	currentBeforeBlockId(
		blocks: EditorBlock[],
		rowIndex: number,
		lineLayouts: EditorLineLayout[],
		chosenIndent: number
	): string | null {
		return this.resolveDropPlacement(blocks, lineLayouts, rowIndex, chosenIndent).beforeBlockId ?? null;
	}

	isImplicitBodyTarget(target: BranchTarget | null | undefined): boolean {
		if (!target || target.branch !== "body") {
			return false;
		}

		const owner = this.findBlockById(this.getBlocks(), target.ownerId);
		return owner !== null && this.isControlBlock(owner) && (owner.bodyBlocks?.length ?? 0) === 0;
	}
}
