import type { EditorBlock } from "./model";

export interface ContextMenuAction {
  id: string;
  label: string;
  enabled: (selection: EditorBlock[]) => boolean;
  execute: (selection: EditorBlock[]) => void;
}

export class SelectionState {
  private ids = new Set<string>();
  private anchorId: string | null = null;

  get size(): number { return this.ids.size; }
  has(id: string): boolean { return this.ids.has(id); }
  getIds(): ReadonlySet<string> { return this.ids; }
  getAnchorId(): string | null { return this.anchorId; }

  select(id: string): void {
    this.ids = new Set([id]);
    this.anchorId = id;
  }

  /** Ctrl-click: toggle one block without moving anchor. */
  ctrlToggle(id: string): void {
    const next = new Set(this.ids);
    if (next.has(id)) {
      next.delete(id);
      if (this.anchorId === id) this.anchorId = next.size > 0 ? [...next][next.size - 1]! : null;
    } else {
      next.add(id);
      this.anchorId = id;
    }
    this.ids = next;
  }

  /** Shift-click: select contiguous range from anchor to id in flat document order. */
  selectRange(id: string, flatIds: string[]): void {
    const anchor = this.anchorId ?? id;
    const fromIdx = flatIds.indexOf(anchor);
    const toIdx = flatIds.indexOf(id);
    if (fromIdx === -1 || toIdx === -1) {
      this.select(id);
      return;
    }
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    this.ids = new Set(flatIds.slice(lo, hi + 1));
    // anchor stays fixed so subsequent shift-clicks extend from same anchor
  }

  clear(): void { this.ids = new Set(); this.anchorId = null; }

  /** Returns top-level block ids in document order, excluding blocks whose ancestor is also selected. */
  resolveTopLevel(blocks: EditorBlock[]): string[] {
    const selected = this.ids;
    if (selected.size === 0) return [];
    const result: string[] = [];
    const visit = (list: EditorBlock[]): void => {
      for (const block of list) {
        if (selected.has(block.id)) {
          result.push(block.id);
          // skip children — they travel with their parent
        } else {
          if (block.bodyBlocks) visit(block.bodyBlocks);
          if (block.alternateBodyBlocks) visit(block.alternateBodyBlocks);
        }
      }
    };
    visit(blocks);
    return result;
  }
}
