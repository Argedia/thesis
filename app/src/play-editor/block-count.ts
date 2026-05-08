import type { EditorBlock } from "./model";

const countBlockTree = (block: EditorBlock): number => {
  let total = 1;

  if (block.inputBlock) {
    total += countBlockTree(block.inputBlock);
  }

  block.inputBlocks?.forEach((inputBlock) => {
    if (inputBlock) {
      total += countBlockTree(inputBlock);
    }
  });

  block.bodyBlocks?.forEach((child) => {
    total += countBlockTree(child);
  });

  block.alternateBodyBlocks?.forEach((child) => {
    total += countBlockTree(child);
  });

  return total;
};

export const countEditorBlocks = (blocks: EditorBlock[]): number =>
  blocks.reduce((acc, block) => acc + countBlockTree(block), 0);

