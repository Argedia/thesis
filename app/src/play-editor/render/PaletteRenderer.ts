import type { PaletteBlock } from "../model";
import type { PaletteGroupId } from "../BlockMetadata";

export interface PaletteRendererContext {
  getPaletteBlocks(): PaletteBlock[];
  getIsActiveRoutineFunction(): boolean;
  getIsLocked(): boolean;
  getPaletteGroupId(block: PaletteBlock): PaletteGroupId;
  getPaletteGroupLabel(groupId: PaletteGroupId): string;
  getDefinitionDescriptor(block: PaletteBlock): { chip?: string; label: string };
  getBlocksHeadingText(): string;
  getDragHintText(): string;
  applyBlockColor(element: HTMLElement, color?: string): void;
  onStartPaletteDrag(event: PointerEvent, block: PaletteBlock, rect: DOMRect): void;
}

export class PaletteRenderer {
  public constructor(private readonly ctx: PaletteRendererContext) {}

  public render(container: HTMLElement): void {
    const palette = document.createElement("aside");
    palette.className = "scratch-palette";
    if (this.ctx.getIsActiveRoutineFunction()) {
      palette.classList.add("function-routine");
    }

    const heading = document.createElement("div");
    heading.className = "builder-heading";
    heading.innerHTML = `<strong>${this.ctx.getBlocksHeadingText()}</strong><span>${this.ctx.getDragHintText()}</span>`;
    palette.appendChild(heading);

    const groups = document.createElement("div");
    groups.className = "palette-groups";

    const groupOrder: PaletteGroupId[] = [
      "structures",
      "values",
      "logic",
      "functions",
      "variables"
    ];

    groupOrder.forEach((groupId) => {
      const groupBlocks = this.ctx
        .getPaletteBlocks()
        .filter((block) => this.ctx.getPaletteGroupId(block) === groupId);
      if (groupBlocks.length === 0) {
        return;
      }

      const section = document.createElement("section");
      section.className = "palette-group";

      const sectionHeading = document.createElement("div");
      sectionHeading.className = "palette-group-heading";
      sectionHeading.textContent = this.ctx.getPaletteGroupLabel(groupId);
      section.appendChild(sectionHeading);

      const list = document.createElement("div");
      list.className = "palette-list palette-group-list";

      groupBlocks.forEach((block) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "editor-block palette sky";
        if (block.kind === "var_declaration" && this.ctx.getIsActiveRoutineFunction()) {
          button.classList.add("palette-declaration-function-ready");
        }
        this.ctx.applyBlockColor(button, block.color);

        const descriptor = this.ctx.getDefinitionDescriptor(block);
        if (descriptor.chip) {
          const chip = document.createElement("span");
          chip.className = "block-chip";
          chip.textContent = descriptor.chip;
          button.appendChild(chip);
        }
        const title = document.createElement("strong");
        title.textContent = descriptor.label;
        button.appendChild(title);

        if (this.ctx.getIsLocked()) {
          button.disabled = true;
        }
        button.addEventListener("pointerdown", (event) => {
          const rect = button.getBoundingClientRect();
          this.ctx.onStartPaletteDrag(event, block, rect);
        });
        list.appendChild(button);
      });

      section.appendChild(list);
      groups.appendChild(section);
    });

    palette.appendChild(groups);
    container.appendChild(palette);
  }
}
