import type { EditorBlock, EditorDragState } from "../model";
import type { PreviewDescriptor } from "../contracts/types";

export interface GhostRendererContext {
  getDragState(): EditorDragState | null;
  findDraggingBlock(): EditorBlock | null;
  createPreviewBlockFromDragState(): EditorBlock | null;
  renderGhostBlockInstance(block: EditorBlock, nested?: boolean): HTMLElement;
  buildPreviewDescriptor(): PreviewDescriptor | null;
  renderPreviewBlock(descriptor: PreviewDescriptor): HTMLElement;
}

export class GhostRenderer {
  public constructor(private readonly ctx: GhostRendererContext) {}

  public render(container: HTMLElement): void {
    const dragState = this.ctx.getDragState();
    if (!dragState) {
      return;
    }

    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.style.transform = `translate(${dragState.x}px, ${dragState.y}px)`;
    const previewBlock = this.ctx.createPreviewBlockFromDragState();
    if (previewBlock) {
      ghost.appendChild(this.ctx.renderGhostBlockInstance(previewBlock));
    } else {
      const draggingBlock = this.ctx.findDraggingBlock();
      const descriptor = draggingBlock
        ? this.ctx.buildPreviewDescriptor()
        : this.ctx.buildPreviewDescriptor();
      if (descriptor) {
        ghost.appendChild(this.ctx.renderPreviewBlock(descriptor));
      }
    }
    container.appendChild(ghost);
  }
}
