import { produce } from "immer";
import type { EditorBlock } from "../model";
import type { SelectionState } from "../SelectionState";
import { findParentBodyOf } from "./blockTreeSearch";

const generateId = (): string =>
  `blk-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;

/** Deep-clone a block tree, assigning fresh IDs to every node. */
const cloneBlock = (block: EditorBlock): EditorBlock => ({
  ...block,
  id: generateId(),
  inputBlock: block.inputBlock ? cloneBlock(block.inputBlock) : block.inputBlock,
  inputBlocks: block.inputBlocks?.map((b) => (b ? cloneBlock(b) : b)),
  bodyBlocks: block.bodyBlocks?.map(cloneBlock),
  alternateBodyBlocks: block.alternateBodyBlocks?.map(cloneBlock)
});

export interface BlockSelectionContext {
  getBlocks(): EditorBlock[];
  setBlocks(blocks: EditorBlock[]): void;
  getSelection(): SelectionState;
  emitStatus(msg: string): void;
}

export class BlockSelectionService {
  public constructor(private readonly ctx: BlockSelectionContext) {}

  /** Delete all selected top-level blocks. */
  public deleteSelection(): void {
    const selection = this.ctx.getSelection();
    const topIds = selection.resolveTopLevel(this.ctx.getBlocks());
    if (topIds.length === 0) return;

    let blocks = this.ctx.getBlocks();
    for (const id of topIds) {
      blocks = removeFromTree(blocks, id);
    }
    this.ctx.setBlocks(blocks);
    selection.clear();
    this.ctx.emitStatus(topIds.length === 1 ? "Block removed." : `${topIds.length} blocks removed.`);
  }

  /** Duplicate selected top-level blocks, inserting clones after the last selected block. */
  public duplicateSelection(): void {
    const selection = this.ctx.getSelection();
    const blocks = this.ctx.getBlocks();
    const topIds = selection.resolveTopLevel(blocks);
    if (topIds.length === 0) return;

    // Find last selected block's position to insert after it
    const lastId = topIds[topIds.length - 1]!;
    const clones = topIds
      .map((id) => findBlockInTree(blocks, id))
      .filter((b): b is EditorBlock => b !== null)
      .map(cloneBlock);

    const next = insertAfter(blocks, lastId, clones);
    this.ctx.setBlocks(next);
    // Select the newly created clones
    selection.clear();
    clones.forEach((c) => selection.ctrlToggle(c.id));
    this.ctx.emitStatus(clones.length === 1 ? "Block duplicated." : `${clones.length} blocks duplicated.`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const findBlockInTree = (blocks: EditorBlock[], id: string): EditorBlock | null => {
  for (const b of blocks) {
    if (b.id === id) return b;
    const inBody = b.bodyBlocks ? findBlockInTree(b.bodyBlocks, id) : null;
    if (inBody) return inBody;
    const inAlt = b.alternateBodyBlocks ? findBlockInTree(b.alternateBodyBlocks, id) : null;
    if (inAlt) return inAlt;
  }
  return null;
};

const removeFromTree = (blocks: EditorBlock[], id: string): EditorBlock[] =>
  produce(blocks, (draft) => {
    const removeFrom = (list: typeof draft): boolean => {
      const idx = list.findIndex((b) => b.id === id);
      if (idx !== -1) { list.splice(idx, 1); return true; }
      for (const b of list) {
        if (b.bodyBlocks && removeFrom(b.bodyBlocks as typeof draft)) return true;
        if (b.alternateBodyBlocks && removeFrom(b.alternateBodyBlocks as typeof draft)) return true;
      }
      return false;
    };
    removeFrom(draft);
  });

/** Insert `clones` immediately after the block with `afterId` in the same container. */
const insertAfter = (blocks: EditorBlock[], afterId: string, clones: EditorBlock[]): EditorBlock[] =>
  produce(blocks, (draft) => {
    const insertIn = (list: typeof draft): boolean => {
      const idx = list.findIndex((b) => b.id === afterId);
      if (idx !== -1) { list.splice(idx + 1, 0, ...(clones as typeof draft)); return true; }
      for (const b of list) {
        if (b.bodyBlocks && insertIn(b.bodyBlocks as typeof draft)) return true;
        if (b.alternateBodyBlocks && insertIn(b.alternateBodyBlocks as typeof draft)) return true;
      }
      return false;
    };
    insertIn(draft);
  });
