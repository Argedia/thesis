import type { EditorBlock, EditorDragState } from "../model";

export interface GhostRendererContext {
  getDragState(): EditorDragState | null;
  createPreviewBlockFromDragState(): EditorBlock | null;
  renderGhostBlockInstance(block: EditorBlock, nested?: boolean): HTMLElement;
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
    }
    container.appendChild(ghost);
  }
}
