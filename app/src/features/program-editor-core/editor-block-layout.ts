import type { ControlBodyKey, EditorBlock, EditorLineLayout } from "./types";
import { ELSE_BLOCK_ID_SUFFIX } from "./editor-layout-constants";

const isControlBlock = (block: EditorBlock) =>
	block.kind === "conditional" || block.kind === "while" || block.kind === "for_each";

// else blocks render as a header line at the same depth as their sibling if-block;
// their bodyBlocks are visited at depth+1 just like any control body.
const isElseBlock = (block: EditorBlock) => block.kind === "else";

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
		promotedBranchTarget?: {
			indent: number;
			ownerId: string;
			branch: ControlBodyKey;
		};
	}) => {
		const dedupedPotential = Array.from(new Set(config.indentPotential)).sort((a, b) => a - b);
		lines.push({
			id: `drop-line-${(dropLineId += 1)}`,
			role: "drop",
			depth: config.depth,
			indentCurrent: config.depth,
			indentPotential: dedupedPotential,
			increaseNextIndentation: dedupedPotential.length > 1,
			bodyOwnerPath: config.bodyOwnerPath,
			controlPath: config.controlPath,
			block: null,
			topLevelIndex: config.insertionRootIndex,
			branchOwnerId: config.branchOwnerId,
			branch: config.branch,
			beforeBlockId: config.beforeBlockId,
			insertionRootIndex: config.insertionRootIndex,
			promotedBranchTarget: config.promotedBranchTarget
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
		const prevBlock = index > 0 ? currentBlocks[index - 1] : null;
		const prevIsControl = prevBlock ? isControlBlock(prevBlock) : false;
		const prevIsElse = prevBlock ? isElseBlock(prevBlock) : false;

		// Drop line before this block.
		// After a control block: allow both depth (sibling) and depth+1 (into body).
		// After an else block: same treatment.
		// First block in a nested body: allow unindenting (depth-1) as well.
		pushDropLine({
			depth,
			indentPotential:
				index === 0
					? (controlPath.length > 0 ? [depth - 1, depth] : [depth])
					: (prevIsControl || prevIsElse) ? [depth, depth + 1] : [depth],
			bodyOwnerPath,
			controlPath,
			insertionRootIndex: effectiveTopLevelIndex,
			beforeBlockId: block.id,
			branchOwnerId: options?.branchOwnerId,
			branch: options?.branch,
			promotedBranchTarget:
				(prevIsControl || prevIsElse) && prevBlock
					? {
						indent: depth + 1,
						ownerId: prevBlock.id,
						branch: "body"
					}
					: undefined
		});

		if (isElseBlock(block)) {
			// Else blocks emit an else_header line (same depth as sibling if-block),
			// then visit their bodyBlocks at depth+1.
			lines.push({
				id: `line-${block.id}`,
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
			} else {
				// Empty else body: emit a single drop line inside it
				pushDropLine({
					depth: depth + 1,
					indentPotential: [depth + 1],
					bodyOwnerPath: [...bodyOwnerPath, block.id],
					controlPath: [...controlPath, { ownerId: block.id, branch: "body" }],
					branchOwnerId: block.id,
					branch: "body"
				});
			}
		} else {
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
			} else if (isControlBlock(block)) {
				// Empty control body: emit a single drop line inside it
				pushDropLine({
					depth: depth + 1,
					indentPotential: [depth + 1],
					bodyOwnerPath: [...bodyOwnerPath, block.id],
					controlPath: [...controlPath, { ownerId: block.id, branch: "body" }],
					branchOwnerId: block.id,
					branch: "body"
				});
			}
		}

		if (index === currentBlocks.length - 1) {
			const lastIsControl = isControlBlock(block);
			const lastIsElse = isElseBlock(block);
			pushDropLine({
				depth,
				indentPotential: (lastIsControl || lastIsElse) ? [depth, depth + 1] : [depth],
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
