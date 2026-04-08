import type { ControlBodyKey, EditorBlock, EditorLineLayout } from "./types";

export const buildEditorLineLayoutFromBlocks = (blocks: EditorBlock[]): EditorLineLayout[] => {
  const lines: EditorLineLayout[] = [];
  let dropLineId = 0;
  let codeLineNumber = 0;
  const isControlBlock = (block: EditorBlock) => block.kind === "conditional" || block.kind === "while";

  const pushDropLine = (config: {
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

  const visit = (
    currentBlocks: EditorBlock[],
    depth: number,
    bodyOwnerPath: string[],
    controlPath: Array<{ ownerId: string; branch: ControlBodyKey }>,
    branchOwnerId?: string,
    branch?: ControlBodyKey,
    topLevel = false,
    rootTopLevelIndex?: number
  ) => {
    currentBlocks.forEach((block, index) => {
      const effectiveTopLevelIndex = topLevel ? index : rootTopLevelIndex;
      pushDropLine({
        depth,
        indentPotential:
          index === 0
            ? controlPath.length > 0
              ? [depth - 1, depth]
              : [depth]
            : [depth],
        bodyOwnerPath,
        controlPath,
        insertionRootIndex: effectiveTopLevelIndex,
        beforeBlockId: block.id,
        branchOwnerId,
        branch
      });

      lines.push({
        id: `line-${block.id}`,
        role: "block",
        lineNumber: (codeLineNumber += 1),
        depth,
        indentCurrent: depth,
        indentPotential: isControlBlock(block) ? [depth, depth + 1] : [depth],
        increaseNextIndentation: isControlBlock(block),
        bodyOwnerPath,
        controlPath,
        block,
        blockId: block.id,
        topLevelIndex: effectiveTopLevelIndex,
        branchOwnerId,
        branch,
        isLastInBranch: branchOwnerId ? index === currentBlocks.length - 1 : undefined
      });

      if ((block.bodyBlocks?.length ?? 0) > 0) {
        visit(
          block.bodyBlocks ?? [],
          depth + 1,
          [...bodyOwnerPath, block.id],
          [...controlPath, { ownerId: block.id, branch: "body" }],
          block.id,
          "body",
          false,
          effectiveTopLevelIndex
        );
      }

      if (block.conditionalMode === "if-else") {
        lines.push({
          id: `line-${block.id}-else`,
          role: "else_header",
          lineNumber: (codeLineNumber += 1),
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
        visit(
          block.alternateBodyBlocks ?? [],
          depth + 1,
          [...bodyOwnerPath, block.id],
          [...controlPath, { ownerId: block.id, branch: "alternateBody" }],
          block.id,
          "alternateBody",
          false,
          effectiveTopLevelIndex
        );
      }

      if (index === currentBlocks.length - 1) {
        pushDropLine({
          depth,
          indentPotential: isControlBlock(block) ? [depth, depth + 1] : [depth],
          bodyOwnerPath,
          controlPath,
          insertionRootIndex:
            topLevel && effectiveTopLevelIndex !== undefined ? effectiveTopLevelIndex + 1 : undefined,
          branchOwnerId,
          branch
        });
      }
    });
  };

  if (blocks.length === 0) {
    pushDropLine({
      depth: 0,
      indentPotential: [0],
      bodyOwnerPath: [],
      controlPath: [],
      insertionRootIndex: 0
    });
  }

  visit(blocks, 0, [], [], undefined, undefined, true);
  return lines;
};

export const buildEditorLineLayout = buildEditorLineLayoutFromBlocks;
