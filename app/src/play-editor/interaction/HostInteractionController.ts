export interface HostInteractionContext {
  isLocked(): boolean;
  hasOpenWheel(): boolean;
  closeWheel(): void;
  rerender(): void;
}

export class HostInteractionController {
  public attach(host: HTMLElement, ctx: HostInteractionContext): () => void {
    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    const closeWheelOnBackgroundPress = (event: PointerEvent) => {
      if (ctx.isLocked()) {
        return;
      }
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (
        target.closest(".operation-wheel") ||
        target.closest(".editor-block-handle") ||
        target.closest(".editor-block-instance-handle")
      ) {
        return;
      }

      if (ctx.hasOpenWheel()) {
        ctx.closeWheel();
        ctx.rerender();
      }
    };

    host.addEventListener("contextmenu", preventContextMenu);
    host.addEventListener("pointerdown", closeWheelOnBackgroundPress);

    return () => {
      host.removeEventListener("contextmenu", preventContextMenu);
      host.removeEventListener("pointerdown", closeWheelOnBackgroundPress);
    };
  }
}
