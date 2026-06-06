import type { EditorBlock } from "../model";
import type { ContextMenuAction } from "../SelectionState";

export class ContextMenuRenderer {
  private menuEl: HTMLElement | null = null;
  private removeListener: (() => void) | null = null;

  public open(
    x: number,
    y: number,
    selection: EditorBlock[],
    actions: ContextMenuAction[],
    container: HTMLElement,
    onClose: () => void
  ): void {
    this.close();

    const menu = document.createElement("div");
    menu.className = "editor-context-menu";

    for (const action of actions) {
      const enabled = action.enabled(selection);
      const item = document.createElement("button");
      item.className = `editor-context-menu-item${enabled ? "" : " disabled"}`;
      item.textContent = action.label;
      item.disabled = !enabled;
      if (enabled) {
        item.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          action.execute(selection);
          this.close();
          onClose();
        });
      }
      menu.appendChild(item);
    }

    // Position — keep within viewport
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    menu.style.left = `${Math.min(x, vw - rect.width - 8)}px`;
    menu.style.top = `${Math.min(y, vh - rect.height - 8)}px`;

    this.menuEl = menu;

    // Close on outside click or Escape
    const onPointerDown = (e: PointerEvent): void => {
      if (!menu.contains(e.target as Node)) {
        this.close();
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        this.close();
        onClose();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    document.addEventListener("keydown", onKeyDown);
    this.removeListener = () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("keydown", onKeyDown);
    };
  }

  public close(): void {
    this.menuEl?.remove();
    this.menuEl = null;
    this.removeListener?.();
    this.removeListener = null;
  }

  public isOpen(): boolean { return this.menuEl !== null; }
}
