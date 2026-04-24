import type { EditorBlock, EditorLineLayout } from "./model";
import type { DragGeometry } from "./layout";
import { buildEditorLineLayout } from "./model";
import { calculateDropIndex } from "./layout";

/**
 * Pure utility functions for drag/drop geometry calculations
 */

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

/**
 * Service for calculating drag/drop geometry and placement
 */
export class DragDropGeometryService {
	constructor(
		private editorLane: HTMLDivElement | null,
		private lineRowRefs: Map<string, HTMLDivElement>,
		private slotRefs: Map<string, HTMLDivElement>,
		private dragState: any,
		private dragBaseLineRects: Array<{ id: string; rect: DOMRect }> | null,
		private parseSlotKey: (key: string) => { ownerId: string; slotId: string },
		private canUseSlotTarget: (targetSlotKey: string) => boolean,
		private findBlockById: (blocks: EditorBlock[], blockId: string) => EditorBlock | null,
		private isControlBlock: (block: EditorBlock | null | undefined) => block is any,
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
	): { index: number; visualLineIndex: number; isOverEditor: boolean } {
		const { index: visualLineIndex, isOverEditor } = calculateDropIndex(
			drag,
			this.editorLane?.getBoundingClientRect(),
			this.dragBaseLineRects ?? this.getLineRects(lineLayouts),
			lineLayouts.length,
			this.dragState?.visualLineIndex ?? null
		);

		if (visualLineIndex >= lineLayouts.length) {
			return {
				index: this.getBlocks().length,
				visualLineIndex,
				isOverEditor
			};
		}

		return {
			index: lineLayouts[visualLineIndex].topLevelIndex ?? this.getBlocks().length,
			visualLineIndex,
			isOverEditor
		};
	}

	currentIndentChoice(
		pointerX: number,
		visualLineIndex: number,
		lineLayouts: EditorLineLayout[]
	): number {
		const laneLeft = this.editorLane?.getBoundingClientRect().left ?? 0;
		const targetLine =
			visualLineIndex < lineLayouts.length
				? lineLayouts[visualLineIndex]
				: lineLayouts[lineLayouts.length - 1] ?? null;

		if (!targetLine) {
			return 0;
		}

		const candidateIndents = Array.from(
			new Set([
				...targetLine.indentPotential,
				...(targetLine.increaseNextIndentation ? [targetLine.indentCurrent + 1] : []),
				...(visualLineIndex >= lineLayouts.length && targetLine.increaseNextIndentation
					? [targetLine.indentCurrent + 1]
					: [])
			])
		).sort((left, right) => left - right);

		if (candidateIndents.length <= 1) {
			return candidateIndents[0] ?? 0;
		}

		let chosenIndent = candidateIndents[0] ?? 0;
		const indentStep = 28;
		const activationInset = 12;

		for (let index = 1; index < candidateIndents.length; index += 1) {
			const indent = candidateIndents[index];
			const thresholdX = laneLeft + indent * indentStep + activationInset;
			if (pointerX >= thresholdX) {
				chosenIndent = indent;
			}
		}

		return chosenIndent;
	}

	resolveDropPlacement(
		blocks: EditorBlock[],
		lineLayouts: EditorLineLayout[],
		visualLineIndex: number,
		chosenIndent: number
	): any {
		const targetLine =
			visualLineIndex < lineLayouts.length ? lineLayouts[visualLineIndex] : null;
		const previousLine =
			visualLineIndex > 0 ? lineLayouts[Math.min(visualLineIndex - 1, lineLayouts.length - 1)] : null;

		const branchFromLine = (
			line: EditorLineLayout | null
		): any | null => {
			if (!line || chosenIndent <= 0) {
				return null;
			}

			if (line.role === "else_header" && chosenIndent === line.indentCurrent + 1) {
				return {
					ownerId: line.blockId!,
					branch: "alternateBody"
				};
			}

			if (line.controlPath.length >= chosenIndent) {
				return line.controlPath[chosenIndent - 1] ?? null;
			}

			if (line.role === "block" && this.isControlBlock(line.block) && chosenIndent === line.indentCurrent + 1) {
				return {
					ownerId: line.blockId!,
					branch: "body"
				};
			}

			return null;
		};

		if (targetLine) {
			const targetBranch = branchFromLine(targetLine);
			if (targetBranch) {
				return {
					branchTarget: targetBranch,
					beforeBlockId:
						targetLine.role === "block" && targetLine.controlPath.length >= chosenIndent
							? targetLine.blockId
							: undefined
				};
			}

			if (targetLine.role === "else_header") {
				return {
					rootIndex: Math.min((targetLine.topLevelIndex ?? blocks.length) + 1, blocks.length)
				};
			}

			return {
				rootIndex: targetLine.topLevelIndex ?? blocks.length
			};
		}

		const previousBranch = branchFromLine(previousLine);
		if (previousBranch) {
			return {
				branchTarget: previousBranch
			};
		}

		return {
			rootIndex: blocks.length
		};
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
				centerY <= slot.rect.bottom
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
		visualLineIndex: number,
		lineLayouts: EditorLineLayout[],
		chosenIndent: number
	): { ownerId: string; branch: any } | null {
		return this.resolveDropPlacement(blocks, lineLayouts, visualLineIndex, chosenIndent).branchTarget ?? null;
	}

	isImplicitBodyTarget(target: { ownerId: string; branch: any } | null | undefined): boolean {
		if (!target || target.branch !== "body") {
			return false;
		}

		const owner = this.findBlockById(this.getBlocks(), target.ownerId);
		return owner !== null && this.isControlBlock(owner) && (owner.bodyBlocks?.length ?? 0) === 0;
	}
}
