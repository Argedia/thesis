import type { ControlBodyKey, EditorBlock, EditorLineLayout } from "./types";

const isControlBlock = (block: EditorBlock) =>
	block.kind === "conditional" || block.kind === "while" || block.kind === "for_each";

const createDropLinePusher = (lines: EditorLineLayout[]) => {
	let dropLineId = 0;
	return (config: {
		depth: number;
		indentPotential: number[];
		bodyOwnerPath: string[];
		controlPath: Array<{ ownerId: string; branch: ControlBodyKey }>;
		insertionRootIndex?: number;
		beforeBlockId?: string;
		branchOwnerId?: string;
		branch?: ControlBodyKey;
	}) => {
		lines.push({
			id: `drop-line-${(dropLineId += 1)}`,
			role: "drop",
			depth: config.depth,
			indentCurrent: config.depth,
			indentPotential: Array.from(new Set(config.indentPotential)).sort((a, b) => a - b),
			increaseNextIndentation: false,
			bodyOwnerPath: config.bodyOwnerPath,
			controlPath: config.controlPath,
			block: null,
			topLevelIndex: config.insertionRootIndex,
			branchOwnerId: config.branchOwnerId,
			branch: config.branch,
			beforeBlockId: config.beforeBlockId,
			insertionRootIndex: config.insertionRootIndex
		});
	};
};

const visitBlockLines = (
	currentBlocks: EditorBlock[],
	depth: number,
	bodyOwnerPath: string[],
	controlPath: Array<{ ownerId: string; branch: ControlBodyKey }>,
	lines: EditorLineLayout[],
	pushDropLine: ReturnType<typeof createDropLinePusher>,
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
		pushDropLine({
			depth,
			indentPotential:
				index === 0 ? (controlPath.length > 0 ? [depth - 1, depth] : [depth]) : [depth],
			bodyOwnerPath,
			controlPath,
			insertionRootIndex: effectiveTopLevelIndex,
			beforeBlockId: block.id,
			branchOwnerId: options?.branchOwnerId,
			branch: options?.branch
		});

		lines.push({
			id: `line-${block.id}`,
			role: "block",
			lineNumber: (state.codeLineNumber += 1),
			depth,
			indentCurrent: depth,
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
				pushDropLine,
				state,
				{
					branchOwnerId: block.id,
					branch: "body",
					rootTopLevelIndex: effectiveTopLevelIndex
				}
			);
		}

		if (block.conditionalMode === "if-else") {
			lines.push({
				id: `line-${block.id}-else`,
				role: "else_header",
				lineNumber: (state.codeLineNumber += 1),
				depth,
				indentCurrent: depth,
				indentPotential: [depth, depth + 1],
				increaseNextIndentation: true,
				bodyOwnerPath,
				controlPath,
				block,
				blockId: block.id,
				topLevelIndex: effectiveTopLevelIndex
			});
		}

		if ((block.alternateBodyBlocks?.length ?? 0) > 0) {
			visitBlockLines(
				block.alternateBodyBlocks ?? [],
				depth + 1,
				[...bodyOwnerPath, block.id],
				[...controlPath, { ownerId: block.id, branch: "alternateBody" }],
				lines,
				pushDropLine,
				state,
				{
					branchOwnerId: block.id,
					branch: "alternateBody",
					rootTopLevelIndex: effectiveTopLevelIndex
				}
			);
		}

		if (index === currentBlocks.length - 1) {
			pushDropLine({
				depth,
				indentPotential: isControlBlock(block) ? [depth, depth + 1] : [depth],
				bodyOwnerPath,
				controlPath,
				insertionRootIndex:
					options?.topLevel && effectiveTopLevelIndex !== undefined ? effectiveTopLevelIndex + 1 : undefined,
				branchOwnerId: options?.branchOwnerId,
				branch: options?.branch
			});
		}
	});
};

export const buildEditorLineLayoutFromBlocks = (blocks: EditorBlock[]): EditorLineLayout[] => {
	const lines: EditorLineLayout[] = [];
	const pushDropLine = createDropLinePusher(lines);
	const state = { codeLineNumber: 0 };

	if (blocks.length === 0) {
		pushDropLine({
			depth: 0,
			indentPotential: [0],
			bodyOwnerPath: [],
			controlPath: [],
			insertionRootIndex: 0
		});
		return lines;
	}

	visitBlockLines(blocks, 0, [], [], lines, pushDropLine, state, { topLevel: true });
	return lines;
};

export const buildEditorLineLayout = buildEditorLineLayoutFromBlocks;
