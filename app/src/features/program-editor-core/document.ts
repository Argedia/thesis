import type { ConditionalBranch, EditorBlock, EditorDocument } from "./types";

export const createEditorDocument = (blocks: EditorBlock[] = []): EditorDocument => ({
  blocks
});

export const blockContainsId = (
  block: EditorBlock,
  blockId: string | null | undefined
): boolean => {
  if (!blockId) {
    return false;
  }

  if (block.id === blockId) {
    return true;
  }

  if (block.inputBlock && blockContainsId(block.inputBlock, blockId)) {
    return true;
  }

  if (block.ifBranch?.some((child) => blockContainsId(child, blockId))) {
    return true;
  }

  return block.elseBranch?.some((child) => blockContainsId(child, blockId)) ?? false;
};

export const findBlockById = (
  blocks: EditorBlock[],
  blockId: string
): EditorBlock | null => {
  for (const block of blocks) {
    if (block.id === blockId) {
      return block;
    }

    if (block.inputBlock) {
      const nested = findBlockById([block.inputBlock], blockId);
      if (nested) {
        return nested;
      }
    }

    if (block.ifBranch) {
      const nested = findBlockById(block.ifBranch, blockId);
      if (nested) {
        return nested;
      }
    }

    if (block.elseBranch) {
      const nested = findBlockById(block.elseBranch, blockId);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

export const updateBlockById = (
  blocks: EditorBlock[],
  blockId: string,
  updater: (block: EditorBlock) => EditorBlock
): EditorBlock[] =>
  blocks.map((block) => {
    if (block.id === blockId) {
      return updater(block);
    }

    if (block.inputBlock) {
      return {
        ...block,
        inputBlock: updateBlockById([block.inputBlock], blockId, updater)[0]
      };
    }

    if (block.ifBranch?.some((child) => blockContainsId(child, blockId))) {
      return {
        ...block,
        ifBranch: updateBlockById(block.ifBranch, blockId, updater)
      };
    }

    if (block.elseBranch?.some((child) => blockContainsId(child, blockId))) {
      return {
        ...block,
        elseBranch: updateBlockById(block.elseBranch, blockId, updater)
      };
    }

    return block;
  });

export const removeNestedBlockById = (
  blocks: EditorBlock[],
  blockId: string
): EditorBlock[] =>
  blocks.map((block) => {
    if (block.inputBlock?.id === blockId) {
      return {
        ...block,
        inputBlock: null
      };
    }

    if (block.inputBlock) {
      return {
        ...block,
        inputBlock: removeNestedBlockById([block.inputBlock], blockId)[0]
      };
    }

    if (block.ifBranch?.some((child) => blockContainsId(child, blockId))) {
      return {
        ...block,
        ifBranch: removeNestedBlockById(block.ifBranch, blockId)
      };
    }

    if (block.elseBranch?.some((child) => blockContainsId(child, blockId))) {
      return {
        ...block,
        elseBranch: removeNestedBlockById(block.elseBranch, blockId)
      };
    }

    return block;
  });

export const removeBlockById = (
  blocks: EditorBlock[],
  blockId: string
): EditorBlock[] =>
  blocks
    .filter((block) => block.id !== blockId)
    .map((block) => ({
      ...block,
      inputBlock:
        block.inputBlock?.id === blockId
          ? null
          : block.inputBlock
            ? removeNestedBlockById([block.inputBlock], blockId)[0]
            : null,
      ifBranch: block.ifBranch ? removeBlockById(block.ifBranch, blockId) : block.ifBranch,
      elseBranch: block.elseBranch ? removeBlockById(block.elseBranch, blockId) : block.elseBranch
    }));

export const extractBlockFromTree = (
  blocks: EditorBlock[],
  blockId: string
): { nextBlocks: EditorBlock[]; block: EditorBlock | null } => {
  const direct = blocks.find((block) => block.id === blockId) ?? null;
  if (direct) {
    return {
      nextBlocks: blocks.filter((block) => block.id !== blockId),
      block: direct
    };
  }

  for (const block of blocks) {
    if (block.ifBranch?.some((child) => blockContainsId(child, blockId))) {
      const extracted = extractBlockFromTree(block.ifBranch, blockId);
      return {
        nextBlocks: updateBlockById(blocks, block.id, (current) => ({
          ...current,
          ifBranch: extracted.nextBlocks
        })),
        block: extracted.block
      };
    }

    if (block.elseBranch?.some((child) => blockContainsId(child, blockId))) {
      const extracted = extractBlockFromTree(block.elseBranch, blockId);
      return {
        nextBlocks: updateBlockById(blocks, block.id, (current) => ({
          ...current,
          elseBranch: extracted.nextBlocks
        })),
        block: extracted.block
      };
    }
  }

  return { nextBlocks: blocks, block: null };
};

export const appendBlockToBranch = (
  blocks: EditorBlock[],
  ownerId: string,
  branch: ConditionalBranch,
  insertedBlock: EditorBlock
): EditorBlock[] =>
  updateBlockById(blocks, ownerId, (block) => ({
    ...block,
    ifBranch: branch === "if" ? [...(block.ifBranch ?? []), insertedBlock] : (block.ifBranch ?? []),
    elseBranch:
      branch === "else" ? [...(block.elseBranch ?? []), insertedBlock] : (block.elseBranch ?? [])
  }));
