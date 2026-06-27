import type { ControlBodyKey, EditorBlock, EditorLineLayout } from "./types";

const isControlBlock = (block: EditorBlock) =>
	block.kind === "conditional" || block.kind === "while" || block.kind === "for_each";

const isElseBlock = (block: EditorBlock) => block.kind === "else";

const visitBlockLines = (
	currentBlocks: EditorBlock[],
	depth: number,
	bodyOwnerPath: string[],
	controlPath: Array<{ ownerId: string; branch: ControlBodyKey }>,
	lines: EditorLineLayout[],
	state: { codeLineNumber: number },
	options?: {
		branchOwnerId?: string;
		branch?: ControlBodyKey;
		topLevel?: boolean;
		rootTopLevelIndex?: number;
	}
) => {
	currentBlocks.forEach((block, index) => {
		const effectiveTopLevelIndex = options?.topLevel ? index : options?.rootTopLevelIndex;

		if (isElseBlock(block)) {
			lines.push({
				id: `line-${block.id}`,
				role: "else_header",
				lineNumber: (state.codeLineNumber += 1),
				depth,
				indentCurrent: depth,
				opensBody: true,
				indentPotential: [depth, depth + 1],
				increaseNextIndentation: true,
				bodyOwnerPath,
				controlPath,
				block,
				blockId: block.id,
				topLevelIndex: effectiveTopLevelIndex,
				branchOwnerId: options?.branchOwnerId,
				branch: options?.branch,
				isLastInBranch: options?.branchOwnerId ? index === currentBlocks.length - 1 : undefined
			});

			if ((block.bodyBlocks?.length ?? 0) > 0) {
				visitBlockLines(
					block.bodyBlocks ?? [],
					depth + 1,
					[...bodyOwnerPath, block.id],
					[...controlPath, { ownerId: block.id, branch: "body" }],
					lines,
					state,
					{ branchOwnerId: block.id, branch: "body", rootTopLevelIndex: effectiveTopLevelIndex }
				);
			}
		} else {
			lines.push({
				id: `line-${block.id}`,
				role: "block",
				lineNumber: (state.codeLineNumber += 1),
				depth,
				indentCurrent: depth,
				opensBody: isControlBlock(block),
				indentPotential: isControlBlock(block) ? [depth, depth + 1] : [depth],
				increaseNextIndentation: isControlBlock(block),
				bodyOwnerPath,
				controlPath,
				block,
				blockId: block.id,
				topLevelIndex: effectiveTopLevelIndex,
				branchOwnerId: options?.branchOwnerId,
				branch: options?.branch,
				isLastInBranch: options?.branchOwnerId ? index === currentBlocks.length - 1 : undefined
			});

			if ((block.bodyBlocks?.length ?? 0) > 0) {
				visitBlockLines(
					block.bodyBlocks ?? [],
					depth + 1,
					[...bodyOwnerPath, block.id],
					[...controlPath, { ownerId: block.id, branch: "body" }],
					lines,
					state,
					{ branchOwnerId: block.id, branch: "body", rootTopLevelIndex: effectiveTopLevelIndex }
				);
			}
		}
	});
};

export const buildEditorLineLayoutFromBlocks = (blocks: EditorBlock[]): EditorLineLayout[] => {
	const lines: EditorLineLayout[] = [];
	const state = { codeLineNumber: 0 };
	visitBlockLines(blocks, 0, [], [], lines, state, { topLevel: true });
	return lines;
};

export const buildEditorLineLayout = buildEditorLineLayoutFromBlocks;
